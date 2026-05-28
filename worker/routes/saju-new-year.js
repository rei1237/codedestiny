import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";

const SERVICE_KEY = "saju-new-year";
const FEATURE_KEY = "premium_pdf_saju_new_year";
const FEATURE_ALIASES = new Set(["saju_new_year_pdf", "premium-saju-newyear-report", "premium_pdf_saju_yearly"]);
const COVER_IMAGE = "/fuctionassets/신년운세.webp";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const STEM_ELEMENT = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
const STEM_YINYANG = { 甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang", 己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin" };
const BRANCH_ELEMENT = { 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" };
const ELEMENT_KO = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CONTROLS = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const BRANCH_COMBOS = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const BRANCH_CLASHES = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const BRANCH_HARMS = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
const BRANCH_BREAKS = { 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" };

export const NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "Chapter 1. 올해의 큰 운 — 신년 전체 흐름", categories: ["올해의 핵심 기운", "대운과 세운의 관계", "올해 가장 강하게 작동하는 오행", "올해를 관통하는 한 문장"] },
  { no: 2, title: "Chapter 2. 나의 사주와 올해의 만남 — 원국과 세운의 충돌/조화", categories: ["일간과 올해 천간의 관계", "지지에서 생기는 합·충·형·파·해", "원국에서 깨어나는 기회", "원국에서 주의해야 할 약점"] },
  { no: 3, title: "Chapter 3. 일과 커리어 운 — 성취와 방향 전환", categories: ["올해 일에서 열리는 기회", "직장/사업/프리랜서 흐름", "인정받기 쉬운 방식", "커리어에서 피해야 할 선택"] },
  { no: 4, title: "Chapter 4. 재물운 — 돈이 들어오고 나가는 흐름", categories: ["수입이 늘어나는 포인트", "지출과 손실 주의점", "투자·저축·계약운", "돈을 지키고 키우는 전략"] },
  { no: 5, title: "Chapter 5. 연애와 관계운 — 마음이 움직이는 방향", categories: ["싱글에게 열리는 인연운", "연애 중인 사람의 관계 흐름", "관계에서 생기는 오해와 갈등", "사랑을 안정시키는 실전 조언"] },
  { no: 6, title: "Chapter 6. 가족·인간관계 운 — 사람으로 들어오는 복과 부담", categories: ["가족과 가까운 사람들과의 흐름", "귀인과 조력자운", "멀리해야 할 관계 패턴", "인간관계를 운으로 바꾸는 법"] },
  { no: 7, title: "Chapter 7. 건강과 마음 운 — 몸과 감정의 리듬", categories: ["올해 약해지기 쉬운 생활 리듬", "스트레스가 쌓이는 방식", "마음이 흔들리는 시기", "회복을 위한 생활 전략"] },
  { no: 8, title: "Chapter 8. 월별 운세 — 12개월 흐름 지도", categories: ["1월~3월 핵심 흐름", "4월~6월 핵심 흐름", "7월~9월 핵심 흐름", "10월~12월 핵심 흐름"] },
  { no: 9, title: "Chapter 9. 올해의 기회와 위험 — 반드시 잡을 것과 피할 것", categories: ["올해 반드시 잡아야 할 기회", "조심해야 할 사람과 상황", "계약·이동·변화의 판단 기준", "실패를 줄이는 현실적 체크리스트"] },
  { no: 10, title: "Chapter 10. 최종 신년 전략 — 올해를 내 편으로 만드는 법", categories: ["올해의 우선순위", "상반기와 하반기 전략", "운을 키우는 행동 습관", "마지막 종합 조언"] },
]);

function clean(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeFeatureKey(raw) {
  const value = clean(raw);
  if (!value) return FEATURE_KEY;
  if (value === FEATURE_KEY || FEATURE_ALIASES.has(value)) return FEATURE_KEY;
  return value;
}

function normalizeInput(body = {}) {
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDate = clean(body.birthDate || body.dob || profile.birthDate || birth.birthDate);
  const parts = birthDate ? birthDate.split(/[-./]/).map((part) => toInt(part, 0)) : [];
  const year = toInt(body.year || body.birthYear || birth.year || parts[0], 0);
  const month = toInt(body.month || body.birthMonth || birth.month || parts[1], 0);
  const day = toInt(body.day || body.birthDay || birth.day || parts[2], 0);
  const hour = toInt(body.hour ?? body.birthHour ?? birth.hour, 12);
  const minute = toInt(body.minute ?? body.birthMinute ?? birth.minute, 0);
  const targetYear = toInt(body.targetYear, new Date().getFullYear());

  if (!year || !month || !day) return { ok: false, code: "MISSING_BIRTH", message: "정확한 신년운세 계산을 위해 생년월일시 정보를 확인해 주세요." };
  if (!targetYear || targetYear < 1900 || targetYear > 2100) return { ok: false, code: "INVALID_TARGET_YEAR", message: "신년운세를 볼 대상 연도를 선택해 주세요." };

  const name = clean(body.name || profile.name) || "사용자";
  const genderRaw = clean(body.gender || profile.gender || "").toLowerCase();
  const gender = genderRaw === "f" || genderRaw.includes("female") || genderRaw.includes("여") ? "F" : genderRaw === "m" || genderRaw.includes("male") || genderRaw.includes("남") ? "M" : "";
  const calendarType = clean(body.calendarType || birth.calendarType || birth.calType || "solar") || "solar";

  return {
    ok: true,
    profile: {
      name,
      gender,
      birth: { year, month, day, hour: clamp(hour, 0, 23), minute: clamp(minute, 0, 59), unknownTime: body.birthTimeKnown === false },
      calendarType,
      location: profile.location || body.location || null,
    },
    targetYear,
  };
}

function sexagenaryYear(year) {
  const index = ((toInt(year, 1984) - 1984) % 60 + 60) % 60;
  return { stem: STEMS[index % 10], branch: BRANCHES[index % 12], label: `${STEMS[index % 10]}${BRANCHES[index % 12]}` };
}

function monthPillar(targetYear, month) {
  const yearStemIndex = STEMS.indexOf(sexagenaryYear(targetYear).stem);
  const firstMonthStemIndex = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = STEMS[(firstMonthStemIndex + month - 1) % 10];
  const branch = MONTH_BRANCHES[(month - 1) % 12];
  return { month, stem, branch, label: `${stem}${branch}`, element: BRANCH_ELEMENT[branch] || STEM_ELEMENT[stem] || "earth" };
}

function elementRelation(dayElement, otherElement) {
  if (!dayElement || !otherElement) return "중립";
  if (dayElement === otherElement) return "동기 공명";
  if (GENERATES[dayElement] === otherElement) return "표현과 생산";
  if (GENERATES[otherElement] === dayElement) return "지원과 회복";
  if (CONTROLS[dayElement] === otherElement) return "관리와 재물";
  if (CONTROLS[otherElement] === dayElement) return "압박과 책임";
  return "중립";
}

function tenGod(dayStem, otherStem) {
  const dayElement = STEM_ELEMENT[dayStem];
  const otherElement = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_YINYANG[dayStem] === STEM_YINYANG[otherStem];
  if (!dayElement || !otherElement) return "미정";
  if (dayElement === otherElement) return samePolarity ? "비견" : "겁재";
  if (GENERATES[dayElement] === otherElement) return samePolarity ? "식신" : "상관";
  if (CONTROLS[dayElement] === otherElement) return samePolarity ? "편재" : "정재";
  if (CONTROLS[otherElement] === dayElement) return samePolarity ? "편관" : "정관";
  if (GENERATES[otherElement] === dayElement) return samePolarity ? "편인" : "정인";
  return "미정";
}

function relationRows(pillars, annualBranch) {
  const rows = [];
  const natal = [
    ["년지", pillars?.year?.branch],
    ["월지", pillars?.month?.branch],
    ["일지", pillars?.day?.branch],
    ["시지", pillars?.hour?.branch],
  ].filter(([, branch]) => branch);

  for (const [label, branch] of natal) {
    if (BRANCH_COMBOS[annualBranch] === branch) rows.push({ type: "합", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 합을 이루어 협력과 연결성이 강해집니다.` });
    if (BRANCH_CLASHES[annualBranch] === branch) rows.push({ type: "충", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 충을 이루어 이동, 변화, 결단 압력이 커집니다.` });
    if (BRANCH_HARMS[annualBranch] === branch) rows.push({ type: "해", label, branch, message: `${label} ${branch}와 세운 ${annualBranch} 사이에 해가 있어 관계의 미세한 오해를 관리해야 합니다.` });
    if (BRANCH_BREAKS[annualBranch] === branch) rows.push({ type: "파", label, branch, message: `${label} ${branch}와 세운 ${annualBranch}가 파를 이루어 계획 변경과 약속 관리가 중요합니다.` });
  }
  return rows;
}

function normalizeEngineSaju(profile, body = {}) {
  let engine = null;
  try {
    engine = buildSajuProfile({ name: profile.name, gender: profile.gender, birth: profile.birth });
  } catch (error) {
    console.warn("[NewYearBook][Flow] ENGINE_CALC_LOCAL_FALLBACK", { message: clean(error?.message || error) });
  }

  const sajuBase = body.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const frontendPillars = sajuBase.pillars || {};
  const pillars = engine?.pillars || {
    year: { stem: clean(frontendPillars.year?.gan), branch: clean(frontendPillars.year?.zhi) },
    month: { stem: clean(frontendPillars.month?.gan), branch: clean(frontendPillars.month?.zhi) },
    day: { stem: clean(frontendPillars.day?.gan), branch: clean(frontendPillars.day?.zhi) },
    hour: { stem: clean(frontendPillars.hour?.gan), branch: clean(frontendPillars.hour?.zhi) },
  };
  const dayMaster = clean(engine?.dayMaster?.stem || sajuBase.core?.dayMaster || pillars.day?.stem);
  const fiveElements = engine?.fiveElements || sajuBase.elementBalance || {};
  const tenGods = engine?.tenGods || sajuBase.tenGods || {};
  const usefulGods = engine?.usefulGods || sajuBase.yongshin || {};
  const daeun = Array.isArray(sajuBase?.timing?.daeun) ? sajuBase.timing.daeun : [];

  return { engine, sajuBase, pillars, dayMaster, fiveElements, tenGods, usefulGods, daeun };
}

function dominantElement(fiveElements = {}, fallback = "earth") {
  const source = fiveElements.scores || fiveElements.counts || fiveElements.ratio || fiveElements;
  const keys = ["wood", "fire", "earth", "metal", "water"];
  return keys.slice().sort((a, b) => Number(source?.[b] || 0) - Number(source?.[a] || 0))[0] || fallback;
}

function buildMonthlyLuck(targetYear, dayStem) {
  const dayElement = STEM_ELEMENT[dayStem] || "earth";
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const pillar = monthPillar(targetYear, month);
    const relation = elementRelation(dayElement, pillar.element);
    const score = clamp(62 + (relation === "지원과 회복" ? 12 : relation === "표현과 생산" ? 8 : relation === "관리와 재물" ? 6 : relation === "압박과 책임" ? -7 : 2) + ((month * 7 + targetYear) % 9), 38, 92);
    const tone = score >= 75 ? "확장" : score >= 60 ? "정비" : "보수";
    return { month, pillar, relation, score: Math.round(score), tone, advice: `${month}월은 ${pillar.label} ${ELEMENT_KO[pillar.element] || "토"} 기운이 두드러져 ${tone} 관점으로 일정을 운영하는 것이 좋습니다.` };
  });
}

function buildInterpretationSeeds(seed) {
  const annual = seed.saju.annualLuck;
  const dominant = ELEMENT_KO[annual.element] || "토";
  const relation = annual.dayMasterRelation || "중립";
  const relations = seed.saju.relations || {};
  const relationHint = Array.isArray(relations.branchRelations) && relations.branchRelations.length ? relations.branchRelations.map((item) => item.type).join("·") : "큰 충돌보다 운영 균형";
  const monthlyStrong = seed.saju.monthlyLuck.filter((m) => m.score >= 75).map((m) => `${m.month}월`).slice(0, 4);
  const monthlyCare = seed.saju.monthlyLuck.filter((m) => m.score < 60).map((m) => `${m.month}월`).slice(0, 4);
  return {
    yearlyTheme: [`${seed.targetYear}년은 ${annual.label} 세운이며 ${dominant} 기운과 ${annual.tenGod} 흐름이 핵심입니다.`, `일간과 세운의 관계는 ${relation}으로 읽히며, 선택의 우선순위를 분명히 해야 합니다.`],
    career: [`${annual.tenGod}의 작동 방식은 일의 책임, 성과 표현, 협업 태도에 직접 연결됩니다.`, `${dominant} 기운이 강해지는 자리에서 강점이 드러납니다.`],
    wealth: [`재물 판단은 ${annual.tenGod}과 월별 점수의 강약을 함께 보아야 합니다.`, `계약과 지출은 ${monthlyCare.length ? monthlyCare.join("·") : "중반 이후"}에 더 보수적으로 점검합니다.`],
    love: [`관계운은 ${relationHint} 신호를 중심으로 속도보다 안정감을 우선합니다.`, `${monthlyStrong.length ? monthlyStrong.join("·") : "상반기"}에는 만남과 대화의 문이 비교적 열립니다.`],
    relationships: [`합은 협력의 문, 충은 변화의 압력, 해·파는 약속과 감정의 관리 포인트로 읽습니다.`, `올해 인간관계는 말의 온도와 역할 경계가 중요합니다.`],
    health: [`${dominant} 기운이 과해지거나 약해질 때 생활 리듬의 편차가 커질 수 있습니다.`, `회복 루틴은 수면, 식사, 움직임을 작게 반복하는 방식이 유리합니다.`],
    monthly: seed.saju.monthlyLuck.map((item) => `${item.month}월 ${item.pillar.label}: ${item.tone} 흐름, ${item.advice}`),
    opportunities: [`${monthlyStrong.length ? monthlyStrong.join("·") : "점수가 높은 달"}에는 제안, 발표, 확장 결정을 검토합니다.`, `${relation} 관계를 활용해 올해의 행동 기준을 세웁니다.`],
    risks: [`${monthlyCare.length ? monthlyCare.join("·") : "점수가 낮은 달"}에는 계약, 지출, 감정적 결정을 늦추는 편이 안전합니다.`, `충·해·파 신호는 관계의 단절보다 조정 요청으로 받아들이는 것이 좋습니다.`],
    finalStrategy: [`상반기는 기반 정비, 하반기는 검증된 기회를 키우는 흐름으로 설계합니다.`, `${seed.targetYear}년의 핵심은 세운을 예언처럼 기다리는 것이 아니라 선택 기준으로 사용하는 것입니다.`],
  };
}

function buildPdfSeed(profile, targetYear, body = {}) {
  const computed = normalizeEngineSaju(profile, body);
  const annual = sexagenaryYear(targetYear);
  const annualElement = BRANCH_ELEMENT[annual.branch] || STEM_ELEMENT[annual.stem] || "earth";
  const dayStem = computed.dayMaster || computed.pillars.day?.stem || "戊";
  const annualLuck = {
    year: targetYear,
    ...annual,
    element: annualElement,
    elementKo: ELEMENT_KO[annualElement] || "토",
    tenGod: tenGod(dayStem, annual.stem),
    dayMasterRelation: elementRelation(STEM_ELEMENT[dayStem] || "earth", annualElement),
  };
  const monthlyLuck = buildMonthlyLuck(targetYear, dayStem);
  const branchRelations = relationRows(computed.pillars, annual.branch);
  const seed = {
    mode: "single",
    targetYear,
    birthProfile: {
      name: profile.name,
      birthDate: `${profile.birth.year}-${pad2(profile.birth.month)}-${pad2(profile.birth.day)}`,
      birthTime: profile.birth.unknownTime ? "" : `${pad2(profile.birth.hour)}:${pad2(profile.birth.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
    },
    saju: {
      dayMaster: dayStem,
      pillars: computed.pillars,
      fiveElements: computed.fiveElements,
      tenGods: computed.tenGods,
      usefulGod: computed.usefulGods,
      luckCycle: computed.daeun,
      annualLuck,
      monthlyLuck,
      relations: {
        stems: [{ dayMaster: dayStem, annualStem: annual.stem, tenGod: annualLuck.tenGod }],
        branches: [{ annualBranch: annual.branch, annualElement }],
        branchRelations,
        combinations: branchRelations.filter((item) => item.type === "합"),
        clashes: branchRelations.filter((item) => item.type === "충"),
        harms: branchRelations.filter((item) => item.type === "해"),
        breaks: branchRelations.filter((item) => item.type === "파"),
        punishments: [],
      },
    },
    interpretationSeeds: {},
    chapters: [],
  };
  seed.interpretationSeeds = buildInterpretationSeeds(seed);
  seed.chapters = buildLocalSkeleton(seed);
  return seed;
}

function seedLine(seed, category, idx) {
  const keyMap = {
    "일": "career",
    "커리어": "career",
    "재물": "wealth",
    "돈": "wealth",
    "연애": "love",
    "사랑": "love",
    "관계": "relationships",
    "건강": "health",
    "마음": "health",
    "월별": "monthly",
    "기회": "opportunities",
    "위험": "risks",
    "전략": "finalStrategy",
  };
  const found = Object.keys(keyMap).find((token) => category.includes(token));
  const list = seed.interpretationSeeds[found ? keyMap[found] : "yearlyTheme"] || seed.interpretationSeeds.yearlyTheme;
  return list[idx % list.length] || seed.interpretationSeeds.yearlyTheme[0];
}

function localParagraph(seed, chapter, category, idx) {
  const annual = seed.saju.annualLuck;
  const line = seedLine(seed, category, idx);
  const relationText = (seed.saju.relations.branchRelations || []).slice(0, 2).map((item) => item.message).join(" ") || "원국과 세운의 관계는 급격한 단정이 아니라 월별 흐름을 보며 조율하는 방식으로 읽습니다.";
  if (chapter.no === 8) {
    const start = idx * 3;
    const months = seed.saju.monthlyLuck.slice(start, start + 3);
    const monthly = months.map((item) => `${item.month}월은 ${item.pillar.label} 흐름으로 ${item.tone} 운영이 알맞고, 점수 ${item.score} 기준에서는 ${item.advice}`).join(" ");
    return `${monthly}\n\n이 구간은 ${annual.label} 세운의 ${annual.elementKo} 기운이 실제 일정 속에서 드러나는 시기입니다. 높은 점수의 달에는 약속과 제안을 넓히고, 낮은 점수의 달에는 문서와 지출, 감정적 결정을 한 번 더 확인하는 방식이 안전합니다.`;
  }
  return `${line} ${category}에서는 ${annual.label} 세운의 ${annual.tenGod} 성격을 현실 선택으로 바꾸는 것이 중요합니다. 현재 계산된 사주와 세운에서 확인되는 범위에서는 강하게 밀어붙이는 결정과 천천히 다듬어야 할 결정을 구분할수록 결과가 안정됩니다.\n\n${relationText} 따라서 올해는 운을 기다리기보다 일정, 관계, 돈의 기준선을 미리 정해두는 편이 좋습니다. 작은 신호를 기록하고 반복되는 상황을 조정하면 ${seed.targetYear}년의 흐름을 내 쪽으로 끌어올 수 있습니다.`;
}

function buildLocalSkeleton(seed) {
  return NEW_YEAR_CHAPTERS.map((chapter) => ({
    no: chapter.no,
    title: chapter.title,
    categories: chapter.categories.map((category, idx) => ({
      title: category,
      localSummary: localParagraph(seed, chapter, category, idx),
      finalText: localParagraph(seed, chapter, category, idx),
    })),
    text: chapter.categories.map((category, idx) => `## ${category}\n${localParagraph(seed, chapter, category, idx)}`).join("\n\n"),
    source: "local-skeleton",
  }));
}

function stripUnsafeText(value) {
  return clean(value)
    .replace(/```[a-z]*|```/gi, "")
    .replace(/\b(payload|debug|engine|raw json|json dump|fallback)\b/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function extractJsonObject(text) {
  const raw = clean(text);
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = fenced ? fenced[1] : raw;
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function normalizeGeneratedChapter(chapter, generated) {
  const sections = Array.isArray(generated?.sections) ? generated.sections : [];
  if (sections.length !== chapter.categories.length) return null;
  const categories = chapter.categories.map((category, idx) => {
    const section = sections[idx] || {};
    const body = stripUnsafeText(section.body || section.text || section.content);
    if (body.length < 80) return null;
    return { title: category.title, localSummary: category.localSummary, finalText: body };
  });
  if (categories.some((item) => !item)) return null;
  return {
    ...chapter,
    categories,
    text: categories.map((item) => `## ${item.title}\n${item.finalText}`).join("\n\n"),
    source: "llm",
  };
}

function buildChapterPrompt(seed, chapter) {
  const safeSeed = {
    targetYear: seed.targetYear,
    birthProfile: seed.birthProfile,
    saju: seed.saju,
    interpretationSeeds: seed.interpretationSeeds,
    chapter: { title: chapter.title, categories: chapter.categories.map((item) => item.title) },
  };
  return [
    "당신은 사주명리학과 신년운세 상담에 능한 전문 상담가입니다.",
    "제공된 사주 원국, 대운, 세운, 월별 흐름 데이터와 챕터 뼈대만 근거로 사용하세요.",
    "사주 계산을 새로 하거나 JSON에 없는 신살, 격국, 용신, 월운을 임의로 만들지 마세요.",
    "챕터 제목과 세부 카테고리 제목은 변경하지 마세요.",
    "각 세부 카테고리는 사용자가 읽는 완성형 상담문으로 2문단 이상 작성하세요.",
    "예언 단정 대신 선택과 전략, 실전 조언 중심으로 쓰세요.",
    "본문에 payload, engine, debug, raw JSON, fallback 같은 내부 표현을 쓰지 마세요.",
    "반드시 JSON만 반환하세요. 형식: {\"sections\":[{\"title\":\"세부 카테고리\",\"body\":\"상담문\"}]}",
    JSON.stringify(safeSeed),
  ].join("\n");
}

async function enhanceWithLlm(env, seed, localChapters) {
  console.info("[NewYearBook][Flow] LLM_WRITE_START", { chapterCount: localChapters.length });
  const chapters = [];
  let fallbackUsed = false;
  for (const chapter of localChapters) {
    try {
      const result = await callGeminiText(env, buildChapterPrompt(seed, chapter), {
        modelEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
        keyEnvKeys: ["PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY", "PREMIUM_GEMINI_API_KEY1", "GEMINI_API_KEY"],
        temperature: 0.72,
        maxOutputTokens: 4096,
        timeoutMs: 30000,
        totalTimeoutMs: 38000,
      });
      if (!result?.ok) throw new Error(result?.message || result?.error || "llm_failed");
      const parsed = extractJsonObject(result.text || result.content || "");
      const normalized = normalizeGeneratedChapter(chapter, parsed);
      if (!normalized) throw new Error("llm_parse_failed");
      chapters.push(normalized);
    } catch (error) {
      fallbackUsed = true;
      console.warn("[NewYearBook][Flow] LLM_CHAPTER_FALLBACK", { chapter: chapter.no, message: clean(error?.message || error) });
      chapters.push({ ...chapter, source: "local-fallback" });
    }
  }
  console.info("[NewYearBook][Flow] LLM_WRITE_OK", { chapterCount: chapters.length, fallbackUsed });
  return { chapters, fallbackUsed };
}

function validateChapters(chapters) {
  if (!Array.isArray(chapters) || chapters.length !== NEW_YEAR_CHAPTERS.length) return false;
  return NEW_YEAR_CHAPTERS.every((blueprint, idx) => {
    const chapter = chapters[idx];
    if (!chapter || chapter.title !== blueprint.title) return false;
    if (!Array.isArray(chapter.categories) || chapter.categories.length !== blueprint.categories.length) return false;
    return blueprint.categories.every((category, catIdx) => chapter.categories[catIdx]?.title === category && clean(chapter.categories[catIdx]?.finalText).length >= 60);
  });
}

function escHtml(value) {
  return clean(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function renderParagraphs(text) {
  return clean(text).split(/\n{2,}/).map((part) => `<p>${escHtml(part).replace(/\n/g, "<br>")}</p>`).join("");
}

function buildReportHtml(seed, chapters) {
  const profile = seed.birthProfile;
  const monthlyRows = seed.saju.monthlyLuck.map((item) => `<tr><td>${item.month}월</td><td>${escHtml(item.pillar.label)}</td><td>${escHtml(item.tone)}</td><td>${item.score}</td><td>${escHtml(item.advice)}</td></tr>`).join("");
  const toc = chapters.map((chapter) => `<li><span>${chapter.no}</span>${escHtml(chapter.title)}</li>`).join("");
  const body = chapters.map((chapter, idx) => `
    <section class="chapter${idx > 0 ? " page-break" : ""}">
      <h2>${escHtml(chapter.title)}</h2>
      ${chapter.categories.map((category) => `<article><h3>${escHtml(category.title)}</h3>${renderParagraphs(category.finalText)}</article>`).join("")}
    </section>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${seed.targetYear} 신년운세 프리미엄 리포트</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#080b19;color:#1f2937;font-family:Arial,'Noto Sans KR',sans-serif;line-height:1.72}.page{background:#fff;min-height:100vh}.cover{min-height:100vh;padding:56px 48px;color:#fff;background:radial-gradient(circle at 70% 20%,rgba(245,158,11,.42),transparent 30%),linear-gradient(145deg,#07111f,#11183a 48%,#3b0f14);display:flex;flex-direction:column;justify-content:space-between}.cover img{width:100%;max-height:360px;object-fit:cover;border-radius:18px;border:1px solid rgba(250,204,21,.42);box-shadow:0 24px 60px rgba(0,0,0,.36)}.badge{display:inline-block;padding:7px 12px;border:1px solid rgba(250,204,21,.7);border-radius:999px;color:#fde68a;font-size:12px;letter-spacing:.08em}.cover h1{font-size:42px;margin:22px 0 8px;color:#fff4c2}.cover p{font-size:17px;color:#fef3c7}.meta{color:#fde68a;font-size:14px}.content{padding:34px 42px;background:#fff}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.summary div{border:1px solid #f1d58b;background:#fff8e1;border-radius:10px;padding:12px}.toc{padding:24px 42px;background:#fffaf0}.toc h2,.chapter h2{color:#7f1d1d}.toc li{margin:8px 0}.toc span{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;margin-right:8px;border-radius:50%;background:#991b1b;color:#fff}.chapter{padding:32px 42px;background:#fff}.chapter h2{font-size:25px;border-bottom:2px solid #f59e0b;padding-bottom:10px}.chapter article{margin:18px 0;padding:16px;border-left:4px solid #d97706;background:#fffaf0;border-radius:0 10px 10px 0}.chapter h3{margin:0 0 8px;color:#92400e}.chapter p{margin:8px 0}.monthly{width:100%;border-collapse:collapse;margin:18px 0;background:#fff}.monthly th,.monthly td{border:1px solid #ead7a6;padding:8px;font-size:12px;text-align:left}.monthly th{background:#7f1d1d;color:#fff}.page-break{page-break-before:always}@media print{body{background:#fff}.page{min-height:auto}.cover{height:100vh}.page-break{break-before:page}}
  </style></head><body><main class="page">
    <section class="cover"><div><span class="badge">CODE DESTINY · NEW YEAR SAJU</span><h1>${seed.targetYear} 신년운세 프리미엄 리포트</h1><p>사주 원국과 세운으로 읽는 올해의 운명 지도</p><p class="meta">${escHtml(profile.name || "사용자")} · ${escHtml(profile.birthDate)} ${escHtml(profile.birthTime || "시간 미상")}</p></div><img src="${COVER_IMAGE}" alt="신년운세 표지 이미지" onerror="this.style.display='none'"><p>${seed.targetYear}년 나의 운의 흐름과 선택 전략</p></section>
    <section class="content"><h2>올해의 핵심 요약</h2><div class="summary"><div><strong>세운</strong><br>${escHtml(seed.saju.annualLuck.label)} · ${escHtml(seed.saju.annualLuck.elementKo)}</div><div><strong>일간 관계</strong><br>${escHtml(seed.saju.annualLuck.tenGod)} · ${escHtml(seed.saju.annualLuck.dayMasterRelation)}</div><div><strong>월별 운영</strong><br>강한 달과 보수 달을 분리해 실행</div></div><table class="monthly"><thead><tr><th>월</th><th>월운</th><th>흐름</th><th>점수</th><th>전략</th></tr></thead><tbody>${monthlyRows}</tbody></table></section>
    <section class="toc"><h2>10챕터 목차</h2><ol>${toc}</ol></section>${body}
  </main></body></html>`;
}

function buildPdfReadyPayload(seed, chapters, metadata = {}) {
  return {
    title: `${seed.targetYear} 신년운세 프리미엄 리포트`,
    filename: `saju-new-year-${seed.targetYear}-${clean(seed.birthProfile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile: seed.birthProfile,
    targetYear: seed.targetYear,
    metadata,
    html: buildReportHtml(seed, chapters),
    chapters: chapters.map((chapter) => ({
      chapter: chapter.no,
      title: chapter.title,
      categories: chapter.categories.map((category) => category.title),
      text: chapter.text,
      source: chapter.source,
    })),
  };
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: SERVICE_KEY, code: "UNAUTHORIZED", message: "신년운세 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: SERVICE_KEY, code: normalized.code, message: normalized.message }, { status: 422 });

  const featureKey = normalizeFeatureKey(body?.featureKey);
  const premiumAccessToken = clean(request.headers.get("x-premium-access-token") || body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access"));

  console.info("[NewYearBook][Flow] BILLING_CHECK_START", { featureKey, userId: auth.userId });
  const access = await requirePremiumReportAccess(env, auth.userId, "sajuNewYear", {
    ...body,
    featureKey,
    reportType: "sajuNewYear",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/saju-new-year/prepare",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      serviceKey: SERVICE_KEY,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401
        ? "신년운세 PDF 생성을 위해 먼저 로그인해 주세요."
        : status === 402
          ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status });
  }
  console.info("[NewYearBook][Flow] BILLING_CHECK_OK", { featureKey, accessType: clean(access.accessType || "") });

  console.info("[NewYearBook][Flow] ENGINE_CALC_START", { targetYear: normalized.targetYear });
  const seed = buildPdfSeed(normalized.profile, normalized.targetYear, body);
  console.info("[NewYearBook][Flow] ENGINE_CALC_OK", { hasDayMaster: Boolean(seed.saju.dayMaster), targetYear: seed.targetYear });
  console.info("[NewYearBook][Flow] PDF_SEED_READY", { targetYear: seed.targetYear, chapterCount: seed.chapters.length });
  console.info("[NewYearBook][Flow] LOCAL_SKELETON_READY", { chapterCount: seed.chapters.length });

  const enhanced = await enhanceWithLlm(env, seed, seed.chapters);
  let chapters = enhanced.chapters;
  let fallbackUsed = Boolean(enhanced.fallbackUsed);
  if (!validateChapters(chapters)) {
    fallbackUsed = true;
    chapters = seed.chapters.map((chapter) => ({ ...chapter, source: "local-fallback" }));
  }

  console.info("[NewYearBook][Flow] PDF_RENDER_START", { chapterCount: chapters.length, fallbackUsed });
  const pdfReady = buildPdfReadyPayload(seed, chapters, { featureKey, reportType: "sajuNewYear", fallbackUsed, accessType: clean(access.accessType || "unknown") });
  console.info("[NewYearBook][Flow] PDF_RENDER_OK", { chapterCount: chapters.length });

  return json({
    ok: true,
    serviceKey: SERVICE_KEY,
    featureKey,
    targetYear: seed.targetYear,
    chapterCount: NEW_YEAR_CHAPTERS.length,
    chapters,
    seed: { ...seed, chapters: undefined },
    newYearPayload: seed,
    pdfReady,
    fallbackUsed,
  });
}

async function handleChapters() {
  return json({ ok: true, serviceKey: SERVICE_KEY, chapterCount: NEW_YEAR_CHAPTERS.length, chapters: NEW_YEAR_CHAPTERS });
}

export async function handleSajuNewYearRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/saju-new-year");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: SERVICE_KEY, message: "지원하지 않는 사주 신년운세 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[NewYearBook][Error]", { message: clean(error?.message || error) });
    return handleRouteError(error, "SajuNewYearRoutes");
  }
}

export const __sajuNewYearTestUtils = {
  NEW_YEAR_CHAPTERS,
  buildPdfSeed,
  buildLocalSkeleton,
  validateChapters,
};