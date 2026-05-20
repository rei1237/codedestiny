import {
  ZIWEI_BODY_PALACE_MEANINGS,
  ZIWEI_PALACE_MEANINGS,
  ZIWEI_PDF_CHAPTERS,
  ZIWEI_RELATIONSHIP_RULES,
  ZIWEI_STAR_STRENGTHS,
} from "./ziwei-pdf-knowledge-base.js";

const PALACE_ORDER = [
  "ming",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "fortune",
  "parents",
];

const PALACE_KEY_MAP = Object.freeze({
  명궁: "ming",
  형제궁: "siblings",
  부처궁: "spouse",
  배우자궁: "spouse",
  자녀궁: "children",
  재백궁: "wealth",
  질액궁: "health",
  천이궁: "travel",
  노복궁: "friends",
  교우궁: "friends",
  관록궁: "career",
  전택궁: "property",
  복덕궁: "fortune",
  부모궁: "parents",
});

const STRENGTH_BY_SYMBOL = Object.freeze({
  "◎": "묘",
  "○": "왕",
  O: "왕",
  "▲": "리",
  "△": "평",
  "함": "함",
  "×": "함",
  X: "함",
});

const SYMBOL_BY_STRENGTH = Object.freeze({
  묘: "◎",
  왕: "○",
  리: "▲",
  평: "△",
  함: "×",
  미상: null,
});

const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ALIAS_MAP = Object.freeze({
  자: "자", 축: "축", 인: "인", 묘: "묘", 진: "진", 사: "사", 오: "오", 미: "미", 신: "신", 유: "유", 술: "술", 해: "해",
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});

const MAIN_STAR_SET = new Set(["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"]);
const DEFAULT_MAIN_STAR_BY_PALACE = Object.freeze({
  ming: "자미",
  siblings: "천기",
  spouse: "태양",
  children: "무곡",
  wealth: "천동",
  health: "염정",
  travel: "천부",
  friends: "태음",
  career: "탐랑",
  property: "거문",
  fortune: "천상",
  parents: "천량",
});

const STEM_ALIAS_MAP = Object.freeze({
  갑: "갑", 을: "을", 병: "병", 정: "정", 무: "무", 기: "기", 경: "경", 신: "신", 임: "임", 계: "계",
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});

const STEM_SIHUA_RULES = Object.freeze({
  갑: [{ type: "화록", star: "염정" }, { type: "화권", star: "파군" }, { type: "화과", star: "무곡" }, { type: "화기", star: "태양" }],
  을: [{ type: "화록", star: "천기" }, { type: "화권", star: "천량" }, { type: "화과", star: "자미" }, { type: "화기", star: "태음" }],
  병: [{ type: "화록", star: "천동" }, { type: "화권", star: "천기" }, { type: "화과", star: "문창" }, { type: "화기", star: "염정" }],
  정: [{ type: "화록", star: "태음" }, { type: "화권", star: "천동" }, { type: "화과", star: "천기" }, { type: "화기", star: "거문" }],
  무: [{ type: "화록", star: "탐랑" }, { type: "화권", star: "태음" }, { type: "화과", star: "우필" }, { type: "화기", star: "천기" }],
  기: [{ type: "화록", star: "무곡" }, { type: "화권", star: "탐랑" }, { type: "화과", star: "천량" }, { type: "화기", star: "문곡" }],
  경: [{ type: "화록", star: "태양" }, { type: "화권", star: "무곡" }, { type: "화과", star: "태음" }, { type: "화기", star: "천동" }],
  신: [{ type: "화록", star: "거문" }, { type: "화권", star: "태양" }, { type: "화과", star: "문곡" }, { type: "화기", star: "문창" }],
  임: [{ type: "화록", star: "천량" }, { type: "화권", star: "자미" }, { type: "화과", star: "좌보" }, { type: "화기", star: "무곡" }],
  계: [{ type: "화록", star: "파군" }, { type: "화권", star: "거문" }, { type: "화과", star: "태음" }, { type: "화기", star: "탐랑" }],
});

const ZIWEI_CHAPTER_CATEGORY_GUIDE = Object.freeze({
  core: ["명궁 원형", "신궁 발현", "성향 구조", "삶의 방향"],
  stars: ["주성 강약", "보조성 작동", "살성 조율", "실전 적용"],
  transformations: ["화록 흐름", "화권 지점", "화과 확장", "화기 리스크"],
  career: ["직업 적성", "성과 패턴", "조직 역학", "전환 전략"],
  wealth: ["수익 구조", "누수 패턴", "자산 배분", "재정 습관"],
  relationship: ["애착 패턴", "갈등 구조", "회복 대화", "경계 설정"],
  health: ["체력 리듬", "스트레스 트리거", "회복 루틴", "생활 처방"],
  timing: ["대운 분기점", "세운 키워드", "월간 운영", "타이밍 전략"],
  decade1: ["초반 10년", "기회 창", "준비 과제", "실행 우선순위"],
  decade2: ["중반 10년", "전환 구간", "성장 병목", "확장 전략"],
  decade3: ["후반 10년", "축적 자산", "관계 재편", "장기 안정"],
  compatibility: ["관계 시너지", "갈등 방아쇠", "협업 방식", "관계 합의"],
  summary: ["핵심 통합", "90일 실행", "리스크 관리", "마스터플랜"],
});

const ZIWEI_CHAPTER_SPECS = Object.freeze(
  ZIWEI_PDF_CHAPTERS.map((chapter, index) => ({
    id: chapter.key || `ch_${index + 1}`,
    chapterNo: index + 1,
    title: chapter.title,
    goal: chapter.goal,
    sections: ZIWEI_CHAPTER_CATEGORY_GUIDE[chapter.key] || ["핵심 구조", "현실 적용", "주의점", "실천 전략"],
    focus: chapter.key,
  })),
);

const ZIWEI_CHAPTER_MIN_LENGTH = 4000;
const ZIWEI_CHAPTER_MAX_LENGTH = 5000;

function asText(value) {
  return String(value == null ? "" : value).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toPlainObject(value) {
  return value && typeof value === "object" ? value : {};
}

function normalizeStrengthSymbol(raw) {
  const token = asText(raw);
  if (!token) return null;
  if (token === "◎") return "◎";
  if (token === "O" || token === "○") return "○";
  if (token === "▲") return "▲";
  if (token === "△") return "△";
  if (token === "함" || token === "X" || token === "×") return "×";
  return null;
}

function normalizeStrengthName(raw) {
  const token = asText(raw);
  if (!token) return null;
  if (["묘", "廟", "묘왕", "묘왕지"].includes(token)) return "묘";
  if (["왕", "旺"].includes(token)) return "왕";
  if (["리", "利", "득", "득지", "리지", "약"].includes(token)) return "리";
  if (["평", "平", "평지"].includes(token)) return "평";
  if (["함", "陷", "함지", "극함", "심한함", "불", "불리"].includes(token)) return "함";
  return null;
}

function pickStrength(rawSymbol, rawStrength) {
  const symbol = normalizeStrengthSymbol(rawSymbol);
  const name = normalizeStrengthName(rawStrength);

  if (name && !symbol) {
    return {
      symbol: SYMBOL_BY_STRENGTH[name] || null,
      name,
      fallbackUsed: true,
    };
  }
  if (!name && symbol) {
    return {
      symbol,
      name: STRENGTH_BY_SYMBOL[symbol] || "미상",
      fallbackUsed: true,
    };
  }
  if (!name && !symbol) {
    return {
      symbol: null,
      name: "미상",
      fallbackUsed: true,
    };
  }
  return {
    symbol,
    name,
    fallbackUsed: false,
  };
}

function inferStarRole(name = "") {
  const token = asText(name);
  if (!token) return "unknown";
  if (["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"].includes(token)) {
    return "main";
  }
  if (["경양", "타라", "지공", "지겁"].includes(token)) return "malefic";
  if (["좌보", "우필", "문창", "문곡", "록존", "녹존"].includes(token)) return "helper";
  return "sub";
}

function strengthMeaning(name) {
  if (name === "미상") {
    return "별의 강약 데이터가 확인되지 않아, 별 자체의 기본 상징과 궁의 의미를 중심으로 해석합니다.";
  }
  const symbol = SYMBOL_BY_STRENGTH[name] || null;
  if (!symbol) return "강약 데이터가 제한적이어서 보수적으로 해석합니다.";
  return ZIWEI_STAR_STRENGTHS[symbol]?.meaning || "강약 데이터가 제한적이어서 보수적으로 해석합니다.";
}

function normalizeStar(star, roleHint = "unknown", fieldPath = "", missingSummary = []) {
  const source = toPlainObject(star);
  const name = asText(source.nameKo || source.name || source.star || source.title);
  if (!name) missingSummary.push(`${fieldPath}.name`);

  const picked = pickStrength(source.symbol, source.strength || source.brightness || source.brightnessKo);

  return {
    name: name || "미상별",
    strengthSymbol: picked.symbol,
    strengthName: picked.name,
    strengthMeaning: strengthMeaning(picked.name),
    role: roleHint !== "unknown" ? roleHint : inferStarRole(name),
    fallbackUsed: Boolean(!name || picked.fallbackUsed),
  };
}

function normalizeSihuaEntry(entry, fieldPath = "", missingSummary = []) {
  const source = toPlainObject(entry);
  const star = asText(source.star || source.name || source.starName);
  const type = normalizeSihuaType(source.type || source.kind || source.label);
  if (!star) missingSummary.push(`${fieldPath}.star`);
  if (!type) missingSummary.push(`${fieldPath}.type`);
  return {
    star: star || "미상",
    type: type || "미상",
    meaning: type ? `${type} 작동` : "사화 데이터가 확인되지 않으므로 별의 기본 성질과 궁의 상호작용을 중심으로 해석합니다.",
  };
}

function resolvePalaceKey(rawKey, rawName, index) {
  const key = asText(rawKey);
  if (PALACE_ORDER.includes(key)) return key;
  const byName = PALACE_KEY_MAP[asText(rawName)] || "";
  if (byName) return byName;
  return PALACE_ORDER[index] || "";
}

function normalizeBranchToken(raw) {
  return BRANCH_ALIAS_MAP[asText(raw)] || "";
}

function normalizeSihuaType(raw) {
  const token = asText(raw);
  if (!token) return "";
  if (["화록", "化祿", "록", "祿"].includes(token)) return "화록";
  if (["화권", "化權", "권", "權"].includes(token)) return "화권";
  if (["화과", "化科", "과", "科"].includes(token)) return "화과";
  if (["화기", "化忌", "기", "忌"].includes(token)) return "화기";
  return "";
}

function normalizeRawStarForPdf(star, fallbackName = "") {
  const source = toPlainObject(star);
  const name = asText(source.nameKo || source.name || source.star || source.title || fallbackName);
  if (!name) return null;

  const picked = pickStrength(source.symbol || source.strengthSymbol, source.strength || source.brightness || source.brightnessKo);
  const strengthName = normalizeStrengthName(source.strength || source.brightness || source.brightnessKo) || (picked.name !== "미상" ? picked.name : "평");
  const strengthSymbol = normalizeStrengthSymbol(source.symbol || source.strengthSymbol) || picked.symbol || SYMBOL_BY_STRENGTH[strengthName] || "△";

  return {
    ...source,
    name,
    nameKo: asText(source.nameKo || name),
    strength: strengthName,
    brightness: asText(source.brightness || strengthName),
    brightnessKo: asText(source.brightnessKo || strengthName),
    symbol: strengthSymbol,
  };
}

function dedupeStars(stars = []) {
  const seen = new Set();
  const rows = [];
  asArray(stars).forEach((star) => {
    const normalized = normalizeRawStarForPdf(star);
    const name = asText(normalized?.nameKo || normalized?.name);
    if (!name) return;
    if (seen.has(name)) return;
    seen.add(name);
    rows.push(normalized);
  });
  return rows;
}

function dedupeSihua(entries = []) {
  const seen = new Set();
  const rows = [];
  asArray(entries).forEach((entry) => {
    const source = toPlainObject(entry);
    const star = asText(source.star || source.name || source.starName);
    const type = normalizeSihuaType(source.type || source.kind || source.label);
    if (!star || !type) return;
    const token = `${star}:${type}`;
    if (seen.has(token)) return;
    seen.add(token);
    rows.push({
      star,
      type,
      meaning: asText(source.meaning) || `${type} 작동`,
    });
  });
  return rows;
}

function extractLegacyPalaceRows(rawChart) {
  const chart = toPlainObject(rawChart);
  const sourcePayload = toPlainObject(chart.sourcePayload);
  const rows = asArray(sourcePayload.palaceStarData).length
    ? asArray(sourcePayload.palaceStarData)
    : asArray(chart.palaceStarData);

  return rows.map((row, idx) => ({
    key: resolvePalaceKey("", row?.palace || row?.nameKo || row?.name, idx),
    nameKo: asText(row?.palace || row?.nameKo || row?.name),
    branch: normalizeBranchToken(row?.branch),
    mainStars: asArray(row?.stars || row?.mainStars),
    auxStars: asArray(row?.auxStars || row?.subStars || row?.minorStars),
    maleficStars: asArray(row?.badStars || row?.maleficStars),
    transformations: asArray(row?.transformations || row?.sihua || row?.fourTransformations),
  }));
}

function extractStemFromChart(rawChart) {
  const chart = toPlainObject(rawChart);
  const chartMeta = toPlainObject(chart.chartMeta);
  const sourcePayload = toPlainObject(chart.sourcePayload);
  const token = asText(chartMeta.yearStemBranch || sourcePayload.yearGan || chart.yearGan || "");
  if (!token) return "";
  return STEM_ALIAS_MAP[token.charAt(0)] || "";
}

function locatePalaceKeyByStar(palaces, starName) {
  const token = asText(starName);
  if (!token) return "";
  const found = asArray(palaces).find((palace) => {
    const main = asArray(palace?.mainStars).some((star) => asText(star?.nameKo || star?.name) === token);
    if (main) return true;
    const sub = asArray(palace?.auxStars).some((star) => asText(star?.nameKo || star?.name) === token);
    if (sub) return true;
    return asArray(palace?.maleficStars).some((star) => asText(star?.nameKo || star?.name) === token);
  });
  return asText(found?.key);
}

function buildGlobalSihuaByPalace(rawChart, palaceRows) {
  const chart = toPlainObject(rawChart);
  const sourcePayload = toPlainObject(chart.sourcePayload);
  const map = new Map();

  const addEntry = (palaceKey, entry) => {
    const key = asText(palaceKey);
    if (!key) return;
    const rows = map.get(key) || [];
    rows.push(entry);
    map.set(key, rows);
  };

  const addSihua = (rawEntry, fallbackKey = "") => {
    const source = toPlainObject(rawEntry);
    const star = asText(source.star || source.name || source.starName);
    const type = normalizeSihuaType(source.type || source.kind || source.label);
    if (!star || !type) return;

    let palaceKey = resolvePalaceKey(source.palaceKey || "", source.palaceName || source.palace || source.nameKo, -1);
    if (!palaceKey && fallbackKey) palaceKey = fallbackKey;
    if (!palaceKey) palaceKey = locatePalaceKeyByStar(palaceRows, star);
    if (!palaceKey) palaceKey = "ming";

    addEntry(palaceKey, {
      star,
      type,
      meaning: asText(source.meaning) || `${type} 작동`,
    });
  };

  asArray(chart.sihua).forEach((entry) => addSihua(entry));
  asArray(sourcePayload.sihua).forEach((entry) => addSihua(entry));

  const rawSihuaData = (chart.sihuaData && typeof chart.sihuaData === "object")
    ? chart.sihuaData
    : ((sourcePayload.sihuaData && typeof sourcePayload.sihuaData === "object") ? sourcePayload.sihuaData : {});
  Object.entries(rawSihuaData).forEach(([star, meta]) => {
    addSihua({
      star,
      type: meta?.type || meta?.kind || meta,
      palaceName: meta?.palaceName,
      palaceKey: meta?.palaceKey,
      meaning: meta?.meaning,
    });
  });

  asArray(palaceRows).forEach((palace) => {
    const key = asText(palace?.key);
    const raw = asArray(palace?.transformations || palace?.sihua || palace?.fourTransformations);
    raw.forEach((entry) => addSihua(entry, key));
  });

  const stem = extractStemFromChart(rawChart);
  const stemRules = asArray(STEM_SIHUA_RULES[stem]);
  stemRules.forEach((entry) => addSihua(entry));

  return map;
}

function enrichPalaceRowsForPdf(rawChart, palacesRaw = []) {
  const legacyRows = extractLegacyPalaceRows(rawChart);

  const prepared = PALACE_ORDER.map((key, index) => {
    const source = asArray(palacesRaw).find((palace) => resolvePalaceKey(palace?.key || palace?.palaceKey, palace?.nameKo || palace?.name || palace?.palaceName || palace?.palace, index) === key) || {};
    const legacy = legacyRows.find((row) => asText(row?.key) === key) || {};

    const branch = normalizeBranchToken(source.branch || source.earthlyBranch || legacy.branch) || BRANCH_ORDER[index] || "";

    const mainCandidates = dedupeStars(
      asArray(source.mainStars || source.stars)
        .concat(asArray(legacy.mainStars || legacy.stars)),
    );
    const auxCandidates = dedupeStars(
      asArray(source.subStars || source.auxStars || source.auxiliaryStars || source.minorStars)
        .concat(asArray(legacy.auxStars || legacy.subStars || legacy.minorStars)),
    );
    const maleficCandidates = dedupeStars(
      asArray(source.maleficStars || source.badStars)
        .concat(asArray(legacy.maleficStars || legacy.badStars)),
    );

    let mainStars = mainCandidates.filter((star) => MAIN_STAR_SET.has(asText(star?.nameKo || star?.name)));
    if (!mainStars.length) {
      mainStars = auxCandidates.filter((star) => MAIN_STAR_SET.has(asText(star?.nameKo || star?.name)));
    }
    if (!mainStars.length) {
      const fallbackName = DEFAULT_MAIN_STAR_BY_PALACE[key] || "자미";
      const fallbackStar = normalizeRawStarForPdf({ name: fallbackName, strength: "평", symbol: "△" }, fallbackName);
      mainStars = fallbackStar ? [fallbackStar] : [];
    }

    const directSihua = dedupeSihua(
      asArray(source.sihua || source.transformations || source.fourTransformations)
        .concat(asArray(legacy.sihua || legacy.transformations || legacy.fourTransformations)),
    );

    return {
      ...legacy,
      ...source,
      key,
      nameKo: asText(source.nameKo || source.name || source.palaceName || legacy.nameKo || legacy.name || ZIWEI_PALACE_MEANINGS[key]?.name),
      branch,
      mainStars,
      auxStars: auxCandidates,
      maleficStars: maleficCandidates,
      transformations: directSihua,
      sihua: directSihua,
    };
  });

  const globalSihuaByPalace = buildGlobalSihuaByPalace(rawChart, prepared);

  return prepared.map((palace, index) => {
    const key = asText(palace?.key || PALACE_ORDER[index]);
    const mergedSihua = dedupeSihua(
      asArray(palace?.sihua || palace?.transformations)
        .concat(asArray(globalSihuaByPalace.get(key))),
    );
    if (!mergedSihua.length) {
      const fallbackStar = asText(palace?.mainStars?.[0]?.nameKo || palace?.mainStars?.[0]?.name || DEFAULT_MAIN_STAR_BY_PALACE[key] || "자미");
      mergedSihua.push({
        star: fallbackStar,
        type: "화록",
        meaning: "화록 작동",
      });
    }

    return {
      ...palace,
      branch: normalizeBranchToken(palace?.branch || palace?.earthlyBranch) || BRANCH_ORDER[index] || null,
      mainStars: dedupeStars(palace?.mainStars),
      auxStars: dedupeStars(palace?.auxStars),
      maleficStars: dedupeStars(palace?.maleficStars),
      transformations: mergedSihua,
      sihua: mergedSihua,
    };
  });
}

function normalizePalace(sourcePalace, index, missingSummary) {
  const source = toPlainObject(sourcePalace);
  const key = resolvePalaceKey(source.key || source.palaceKey, source.nameKo || source.name || source.palaceName, index);
  const meaning = ZIWEI_PALACE_MEANINGS[key] || null;

  let branch = asText(source.branch || source.earthlyBranch);
  if (!branch) {
    branch = BRANCH_ORDER[index] || "";
  }
  const missingFields = [];

  const mainSource = asArray(source.mainStars || source.stars);
  const auxSource = asArray(source.subStars || source.auxStars || source.auxiliaryStars || source.minorStars);
  const maleficSource = asArray(source.maleficStars);
  const sihuaSource = asArray(source.sihua || source.transformations || source.fourTransformations);

  if (!mainSource.length) missingFields.push("mainStars");
  if (!sihuaSource.length) missingFields.push("sihua");

  missingFields.forEach((field) => {
    missingSummary.push(`palaces.${key}.${field}`);
  });

  const mainStars = mainSource.map((star, idx) => normalizeStar(star, "main", `palaces.${key}.mainStars[${idx}]`, missingSummary));
  const auxiliaryNormalized = auxSource
    .map((star, idx) => normalizeStar(star, "unknown", `palaces.${key}.auxStars[${idx}]`, missingSummary));
  const assistantStars = auxiliaryNormalized.filter((star) => star.role === "helper");
  const minorStars = auxiliaryNormalized.filter((star) => star.role !== "helper");
  const maleficStars = maleficSource.map((star, idx) => normalizeStar(star, "malefic", `palaces.${key}.maleficStars[${idx}]`, missingSummary));
  const subStars = assistantStars.concat(minorStars, maleficStars);
  const sihua = sihuaSource.map((entry, idx) => normalizeSihuaEntry(entry, `palaces.${key}.sihua[${idx}]`, missingSummary));

  const oppositePalaceKey = asText(source.oppositePalaceKey);
  const trianglePalaceKeys = asArray(source.triadPalaceKeys || source.trianglePalaceKeys).map(asText).filter(Boolean);

  return {
    key,
    name: meaning?.name || asText(source.nameKo || source.name || source.palaceName) || "미상궁",
    branch: branch || null,
    description: meaning?.expanded || meaning?.meaning || "이 궁의 데이터가 부분적으로 누락되어 기본 궁 의미 중심으로 해석합니다.",
    mainStars,
    assistantStars,
    minorStars,
    maleficStars,
    subStars,
    sihua,
    transformations: sihua,
    oppositePalaceKey: oppositePalaceKey || null,
    trianglePalaceKeys,
    fallbackUsed: missingFields.length > 0,
    missingFields,
  };
}

function buildFallbackAnnualFlow(chartMeta = {}, palaces = []) {
  const mingPalaceKey = String(chartMeta.mingPalaceKey || "ming").trim() || "ming";
  const mingPalace = asArray(palaces).find((palace) => palace?.key === mingPalaceKey) || asArray(palaces)[0] || {};
  const stars = asArray(mingPalace?.mainStars).map((star) => asText(star?.name)).filter(Boolean).slice(0, 3);
  return {
    year: 2026,
    stemBranch: "병오(丙午)",
    palaceKey: mingPalaceKey,
    palaceName: ZIWEI_PALACE_MEANINGS[mingPalaceKey]?.name || asText(mingPalace?.name) || "명궁",
    keyStars: stars,
    guidance: "주도권 확보와 대외 실행 속도 조절이 핵심인 해입니다.",
    fallbackUsed: true,
  };
}

function buildFallbackMonthlyFlow(annualFlow = {}, palaces = []) {
  const baseKey = String(annualFlow?.palaceKey || "ming").trim() || "ming";
  const baseIndex = Math.max(0, PALACE_ORDER.indexOf(baseKey));
  return Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const palaceKey = PALACE_ORDER[(baseIndex + idx) % PALACE_ORDER.length] || "ming";
    const palace = asArray(palaces).find((row) => row?.key === palaceKey) || {};
    return {
      month,
      palaceKey,
      palaceName: ZIWEI_PALACE_MEANINGS[palaceKey]?.name || asText(palace?.name) || palaceKey,
      keyStars: asArray(palace?.mainStars).map((star) => asText(star?.name)).filter(Boolean).slice(0, 2),
      guidance: `${month}월은 ${ZIWEI_PALACE_MEANINGS[palaceKey]?.name || palaceKey} 운영 원칙을 우선 점검하세요.`,
      fallbackUsed: true,
    };
  });
}

function normalizeCyclesForPdf(rawChart = {}, chartMeta = {}, palaces = [], missingSummary = []) {
  const chart = toPlainObject(rawChart);
  const luck = toPlainObject(chart.luck);
  const calcCycles = toPlainObject(toPlainObject(chart.calculatedData).cycles);
  const annualFromLuck = toPlainObject(luck.annual);
  const annualFromCycles = asArray(calcCycles.annual)[0];
  const annual = Object.keys(annualFromLuck).length
    ? annualFromLuck
    : (annualFromCycles && typeof annualFromCycles === "object" ? annualFromCycles : null);
  const monthly = asArray(luck.monthly).length
    ? asArray(luck.monthly)
    : asArray(calcCycles.monthly);
  const daXian = asArray(calcCycles.daXian).length
    ? asArray(calcCycles.daXian)
    : asArray(luck.decadeLuck);

  const normalizedAnnual = annual && Object.keys(toPlainObject(annual)).length
    ? {
      ...toPlainObject(annual),
      fallbackUsed: false,
    }
    : buildFallbackAnnualFlow(chartMeta, palaces);
  if (!annual || !Object.keys(toPlainObject(annual)).length) {
    missingSummary.push("cycles.annual");
  }

  const normalizedMonthly = monthly.length
    ? monthly.map((row, idx) => ({
      month: Number(row?.month || idx + 1),
      palaceKey: asText(row?.palaceKey || row?.key || row?.gong || row?.palace),
      keyStars: asArray(row?.keyStars || row?.stars).map((name) => asText(name)).filter(Boolean).slice(0, 3),
      guidance: asText(row?.guidance || row?.summary || row?.description),
      fallbackUsed: false,
    }))
    : buildFallbackMonthlyFlow(normalizedAnnual, palaces);
  if (!monthly.length) {
    missingSummary.push("cycles.monthly");
  }

  if (!daXian.length) {
    missingSummary.push("cycles.daXian");
  }

  return {
    annual: normalizedAnnual,
    monthly: normalizedMonthly,
    daXian: daXian.length ? daXian : [],
  };
}

function palaceArrayFromRaw(rawChart) {
  const chart = toPlainObject(rawChart);
  if (Array.isArray(chart.palaces)) return chart.palaces;

  const palacesObj = toPlainObject(chart.palaces);
  const fromObject = PALACE_ORDER.map((key) => {
    const entry = toPlainObject(palacesObj[key]);
    return {
      ...entry,
      key,
      nameKo: entry.nameKo || ZIWEI_PALACE_MEANINGS[key]?.name || "",
      earthlyBranch: entry.earthlyBranch || entry.branch || "",
      transformations: entry.transformations || entry.fourTransformations || [],
    };
  });

  if (fromObject.some((entry) => Object.keys(entry).length > 1)) return fromObject;

  const sourcePayload = toPlainObject(chart.sourcePayload);
  const rows = asArray(sourcePayload.palaceStarData);
  if (!rows.length) return [];
  return rows.map((row, idx) => ({
    key: resolvePalaceKey("", row?.palace, idx),
    nameKo: asText(row?.palace),
    branch: asText(row?.branch),
    mainStars: asArray(row?.stars),
    auxStars: asArray(row?.auxStars),
    maleficStars: asArray(row?.badStars),
    transformations: [],
  }));
}

function findBodyPalaceKey(rawChart, normalizedPalaces) {
  const chart = toPlainObject(rawChart);
  const chartMeta = toPlainObject(chart.chartMeta);
  let bodyBranch = normalizeBranchToken(chartMeta.shenGong || chartMeta.bodyPalace || chartMeta.bodyPalaceKey);

  // 1차 fallback: palaces를 순회하며 '신궁' 또는 '身' 이름이 포함된 궁 탐색
  const foundByMeta = normalizedPalaces.find((p) => {
    const name = String(p.name || "").trim();
    return name.includes("신궁") || name.includes("身궁") || name.includes("身宮") || p.key === "shen";
  });
  if (foundByMeta) return foundByMeta.key;

  if (!bodyBranch) {
    // 2차 fallback: 명궁과 동일한 위치로 설정 (자오시생 기준)
    const mingGongBranch = normalizeBranchToken(chartMeta.mingGong || "인");
    const foundMing = normalizedPalaces.find((p) => normalizeBranchToken(p.branch) === mingGongBranch);
    return foundMing?.key || "ming";
  }

  const found = normalizedPalaces.find((palace) => normalizeBranchToken(palace.branch) === bodyBranch);
  return found?.key || "ming";
}

export function normalizeZiweiChartForPdf(rawChart = {}, userProfile = {}) {
  const missingSummary = [];
  const palacesRaw = palaceArrayFromRaw(rawChart);
  const enrichedPalaces = enrichPalaceRowsForPdf(rawChart, palacesRaw);

  const normalizedPalaces = PALACE_ORDER.map((key, index) => {
    const source = enrichedPalaces.find((palace) => resolvePalaceKey(palace?.key || palace?.palaceKey, palace?.nameKo || palace?.name || palace?.palaceName || palace?.palace, index) === key) || { key };
    return normalizePalace(source, index, missingSummary);
  });

  const chart = toPlainObject(rawChart);
  const chartMeta = toPlainObject(chart.chartMeta);

  const mingBranch = normalizeBranchToken(chartMeta.mingGong);
  const mingPalaceKey = normalizedPalaces.find((palace) => Boolean(palace.branch && normalizeBranchToken(palace.branch) === mingBranch))?.key || "ming";
  const bodyPalaceKey = findBodyPalaceKey(rawChart, normalizedPalaces);
  const cycles = normalizeCyclesForPdf(rawChart, { mingPalaceKey, bodyPalaceKey }, normalizedPalaces, missingSummary);
  const stars = {
    mainStars: Array.from(new Set(normalizedPalaces.flatMap((palace) => asArray(palace.mainStars).map((star) => asText(star?.name))).filter(Boolean))),
    assistantStars: Array.from(new Set(normalizedPalaces.flatMap((palace) => asArray(palace.assistantStars).map((star) => asText(star?.name))).filter(Boolean))),
    minorStars: Array.from(new Set(normalizedPalaces.flatMap((palace) => asArray(palace.minorStars).map((star) => asText(star?.name))).filter(Boolean))),
    maleficStars: Array.from(new Set(normalizedPalaces.flatMap((palace) => asArray(palace.maleficStars).map((star) => asText(star?.name))).filter(Boolean))),
    sihua: Array.from(new Set(normalizedPalaces.flatMap((palace) => asArray(palace.sihua).map((item) => `${asText(item?.star)}:${asText(item?.type)}`)).filter(Boolean))),
  };

  if (!bodyPalaceKey) {
    missingSummary.push("bodyPalace");
  }

  const sourceLevel = missingSummary.length === 0
    ? "engine"
    : (missingSummary.length > 16 ? "fallback-heavy" : "engine-with-fallback");

  return {
    userProfile: {
      name: asText(userProfile.name || chart?.profile?.name) || undefined,
      gender: asText(userProfile.gender || chart?.profile?.gender) || undefined,
      birthDate: asText(userProfile.birthDate || chart?.profile?.birth?.solarDate) || undefined,
      birthTime: asText(userProfile.birthTime || chart?.profile?.birth?.time) || undefined,
      lunarDate: asText(userProfile.lunarDate || chart?.profile?.birth?.lunarDate) || undefined,
    },
    chartMeta: {
      命宮: ZIWEI_PALACE_MEANINGS[mingPalaceKey]?.name || "명궁",
      身宮: bodyPalaceKey ? (ZIWEI_PALACE_MEANINGS[bodyPalaceKey]?.name || bodyPalaceKey) : "미상",
      bodyPalaceKey,
      mingPalaceKey,
      generatedAt: new Date().toISOString(),
      source: sourceLevel,
    },
    palaces: normalizedPalaces,
    stars,
    cycles,
    relationships: {
      opposite: ZIWEI_RELATIONSHIP_RULES.opposite,
      triangle: ZIWEI_RELATIONSHIP_RULES.triangle,
      sanfangsazheng: ZIWEI_RELATIONSHIP_RULES.sanfangsazheng,
    },
    missingSummary: Array.from(new Set(missingSummary)),
    knowledgeBase: {
      palaceMeanings: ZIWEI_PALACE_MEANINGS,
      bodyPalaceMeanings: ZIWEI_BODY_PALACE_MEANINGS,
      starStrengths: ZIWEI_STAR_STRENGTHS,
      relationshipRules: ZIWEI_RELATIONSHIP_RULES,
    },
  };
}

export function validateZiweiPdfInput(context) {
  const warnings = [];
  const missingFields = Array.from(new Set(asArray(context?.missingSummary)));

  if (!Array.isArray(context?.palaces) || context.palaces.length !== 12) {
    warnings.push("12궁 데이터가 완전하지 않아 기본 해석 지식 베이스 기반 보완이 포함됩니다.");
  }

  if (!context?.chartMeta?.bodyPalaceKey) {
    warnings.push("신궁 데이터가 명확하지 않아 명궁-관록궁-재백궁-복덕궁 중심의 후천 운 해석으로 보완합니다.");
  }

  if (missingFields.length) {
    warnings.push("일부 세부 명반 데이터가 부족하여 기본 자미두수 해석 지식으로 보완됩니다.");
  }

  return {
    ok: true,
    canGeneratePdf: true,
    warnings,
    missingFields,
  };
}

export function buildZiweiPdfContext({ userProfile = {}, rawChart = {} } = {}) {
  const normalized = normalizeZiweiChartForPdf(rawChart, userProfile);
  const validation = validateZiweiPdfInput(normalized);
  return {
    ...normalized,
    validation,
  };
}

const ZIWEI_BLOCKED_OUTPUT_PATTERNS = [
  /데이터가\s*일부\s*누락된\s*궁은\s*branch,\s*mainStars,\s*strength,\s*sihua/i,
  /\[SYSTEM\]|\[USER\]/i,
  /중요\s*규칙\s*:/i,
  /JSON에\s*없는\s*계산\s*결과를\s*추정하지\s*말/i,
  /chapterJsonPacks|reportPayload\(=calculatedData\)/i,
];

function sanitizeZiweiOutputText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((line) => {
      const s = String(line || "").trim();
      if (!s) return true;
      return !ZIWEI_BLOCKED_OUTPUT_PATTERNS.some((re) => re.test(s));
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildZiweiGeminiPrompt({ chapter, context, previousChapterSummaries = [] }) {
  const chapterSpec = chapter || ZIWEI_CHAPTER_SPECS[0];
  const chapterSections = asArray(chapterSpec?.sections).join(", ");

  const systemPrompt = [
    "너는 30년 경력의 최고급 자미두수 상담가다.",
    "독자와 1:1 대면 상담을 진행하듯, 구체적이고 품격 있는 상담 문체로 운명의 구조를 풀어낸다.",
    "너의 임무는 제공된 자미두수 명반 JSON과 knowledgeBase를 바탕으로, 고급 PDF 리포트에 들어갈 장문 해석을 생성하는 것이다.",
    "중요 규칙:",
    "1. 계산은 하지 않는다. 제공된 명반 데이터와 knowledgeBase만 사용한다.",
    "2. 데이터가 비어 있는 항목은 기본 궁의 의미, 삼방사정, 명궁-신궁 연결 규칙으로 자연스럽게 보강한다.",
    "3. palace.branch, mainStars, strength, sihua가 없더라도 해당 궁의 기본 의미와 주변 궁의 흐름을 바탕으로 해석한다.",
    "4. 허위로 별이나 지지를 만들어내지 않는다.",
    "5. 별 강약 기호가 있으면 반드시 그 기호의 의미를 해석에 반영한다.",
    "6. 문체는 신비롭고 고급스럽되, 실제 상담처럼 구체적이어야 한다.",
    "7. 추상적인 말만 반복하지 말고 성격, 연애, 재물, 직업, 인간관계, 삶의 방향으로 연결해 설명한다.",
    "8. 각 챕터는 공백 포함 총 4000~5000자 범위를 목표로 깊이 있게 작성한다. sections의 각 body 항목은 공백 포함 450자 이상으로, 실제 상담처럼 구체적이어야 한다.",
    "9. 독자가 내 명반을 실제로 읽어준다고 느낄 정도로 구체적으로 작성한다.",
    "10. 무조건 JSON 형식으로만 응답한다.",
    "11. 마크다운 코드블록, 표, 파이프(|) 테이블, 불릿/번호 목록, HTML 태그를 출력하지 않는다.",
    "12. chapterTitle/chapterSubtitle는 입력된 챕터 제목/의도를 따르고, 결론형 요약문 남발을 금지한다.",
    "13. 본 리포트는 13챕터 고정 체계이므로 챕터 번호 체계를 임의로 변경하지 않는다.",
    "14. 데이터 부족/보완/안내/메모 같은 메타 표현을 본문에 쓰지 않는다.",
    "15. 시스템 지침 문장, 프롬프트 규칙 문장, JSON 키 설명 문장을 본문으로 출력하지 않는다.",
    "16. 동일 문장/동일 단락을 반복해 분량을 채우지 않는다.",
    "17. 이전 챕터들과 관점이나 내용이 절대 중복되지 않도록 하라. 제공된 [이전 챕터 요약 정보]를 참조하여, 이미 다른 챕터에서 다룬 해석을 반복하지 않고 이 챕터만의 고유한 관점(예: 성격 자아 -> 직업 자아 -> 재물 성향 등)을 확실히 보여줘라.",
  ].join("\n");

  const duplicateAvoidanceText = previousChapterSummaries.length > 0
    ? `\n[이전 챕터 요약 정보 (내용 중복 절대 금지 가이드)]\n${previousChapterSummaries.join("\n")}\n`
    : "";

  const userPrompt = [
    "다음은 프리미엄 자미두수 PDF 생성을 위한 명반 데이터입니다.",
    "",
    "[사용자 정보]",
    JSON.stringify(context.userProfile || {}, null, 2),
    "",
    "[정규화된 자미두수 명반]",
    JSON.stringify({
      chartMeta: context.chartMeta,
      palaces: context.palaces,
      stars: context.stars,
      cycles: context.cycles,
      relationships: context.relationships,
      missingSummary: context.missingSummary,
    }, null, 2),
    "",
    "[자미두수 기본 해석 Knowledge Base]",
    JSON.stringify(context.knowledgeBase || {}, null, 2),
    "",
    duplicateAvoidanceText,
    "[작성할 챕터]",
    chapterSpec.title,
    "",
    "[챕터 작성 목표 및 세부 카테고리 가이드]",
    chapterSpec.goal,
    chapterSections ? `챕터 카테고리: ${chapterSections}` : "",
    "반드시 각 영역별 특징과 운의 활용도, 대안 행동 계획까지 연결하여 서술하세요.",
    "",
    "[출력 형식]",
    "반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 출력하지 마세요.",
    "{",
    '  "chapterTitle": "string",',
    '  "chapterSubtitle": "string",',
    '  "summary": "string",',
    '  "sections": [',
    '    { "heading": "string", "body": "string" }',
    "  ],",
    '  "practicalAdvice": ["string"],',
    '  "cautions": ["string"],',
    '  "masterConclusion": "string",',
    '  "coreStars": ["string"],',
    '  "corePalaces": ["string"],',
    '  "missingDataNotice": "string | null"',
    "}",
    "",
    "[문체 및 분량 상세 기준]",
    "- 30년 경력 상담가가 직접 읽어주는 1:1 컨설팅 톤으로 쓰세요.",
    "- 별 강약 기호가 있으면 반드시 해석에 반영하세요.",
    "- 챕터 총 분량은 공백 포함 4000~5000자 범위를 지키고, sections 내 각 body 항목은 450자 이상으로 작성하세요.",
    "- 데이터가 없는 경우에는 기본 궁 의미와 knowledgeBase를 활용해 자연스럽게 상담 흐름으로 보강하세요.",
    "- 데이터 부족 안내나 메모성 문구는 출력하지 마세요.",
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    prompt: `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`,
  };
}

export function generateZiweiChapterPrompt({ chapter, context, previousChapterSummaries = [] }) {
  const chapterId = String(chapter?.key || chapter?.id || "").trim();
  const chapterNo = Number(chapter?.chapterNo || chapter?.num || 0);
  const byId = ZIWEI_CHAPTER_SPECS.find((row) => row.id === chapterId);
  const byNo = chapterNo > 0 ? ZIWEI_CHAPTER_SPECS[chapterNo - 1] : null;
  const chapterSpec = byId || byNo || {
    ...(chapter || {}),
    sections: asArray(chapter?.sections),
  };
  return buildZiweiGeminiPrompt({ chapter: chapterSpec, context, previousChapterSummaries });
}

function stripCodeFence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^```(?:json|JSON)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function tryParseJson(text) {
  const source = stripCodeFence(text);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (_) {
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const clipped = source.slice(first, last + 1);
      try {
        return JSON.parse(clipped);
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

function repairJsonString(text) {
  const source = stripCodeFence(text);
  if (!source) return "";
  const clipped = (() => {
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) return source.slice(first, last + 1);
    return source;
  })();

  return clipped
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "    ");
}

function hasValidZiweiChapterStructure(data) {
  const chapter = toPlainObject(data);
  const sections = asArray(chapter.sections)
    .map((row) => toPlainObject(row))
    .filter((row) => asText(row.heading || row.title) && asText(row.body));
  if (sections.length < 2) return false;
  const summary = asText(chapter.summary);
  if (!summary) return false;
  return true;
}

export function parseZiweiGeminiResponse(rawText) {
  const parsed = tryParseJson(rawText);
  if (parsed && hasValidZiweiChapterStructure(parsed)) {
    return { ok: true, data: parsed, repaired: false, structureValid: true };
  }
  if (parsed) {
    return { ok: false, data: parsed, repaired: false, structureValid: false, error: "ZIWEI_JSON_SCHEMA_INVALID" };
  }

  const repairedText = repairJsonString(rawText);
  if (!repairedText) return { ok: false, data: null, repaired: false, structureValid: false, error: "ZIWEI_JSON_EMPTY" };

  try {
    const repaired = JSON.parse(repairedText);
    if (hasValidZiweiChapterStructure(repaired)) {
      return { ok: true, data: repaired, repaired: true, structureValid: true };
    }
    return { ok: false, data: repaired, repaired: true, structureValid: false, error: "ZIWEI_JSON_SCHEMA_INVALID" };
  } catch (_) {
    return { ok: false, data: null, repaired: true, structureValid: false, error: "ZIWEI_JSON_PARSE_FAILED" };
  }
}

export function createFallbackChapter(chapter, context) {
  const spec = chapter || { title: "기본 챕터", goal: "기본 해석" };
  const mingPalace = asArray(context?.palaces).find((palace) => palace?.key === (context?.chartMeta?.mingPalaceKey || "ming")) || asArray(context?.palaces)[0] || {};
  const mingStars = asArray(mingPalace?.mainStars).map((star) => asText(star?.name)).filter(Boolean).slice(0, 3);
  const annualFlow = toPlainObject(context?.cycles?.annual);
  return {
    chapterTitle: spec.title,
    chapterSubtitle: spec.goal || "챕터별 실행 해석",
    summary: "확인된 궁위 데이터와 별 배치를 기준으로 이 챕터의 핵심 흐름을 상담형으로 정리했습니다.",
    sections: [
      {
        heading: "운명의 구조",
        body: `이 영역은 자미두수의 핵심 축을 이루므로, 제공된 궁의 의미와 전체 흐름을 연결해 실전적으로 읽어야 합니다. 현재 명반에서는 ${mingStars.join(", ") || "핵심 주성"}의 작동을 명궁 중심으로 읽는 것이 중요하며, 선택의 우선순위를 명확히 할수록 운의 체감이 빨라집니다.`,
      },
      {
        heading: "실전 운영 전략",
        body: `단정형 예측보다 생활 리듬, 의사결정 기준, 관계 경계 설정처럼 실행 가능한 원칙을 먼저 고정하면 운의 손실을 줄이고 상승 구간을 안정적으로 확대할 수 있습니다. ${asText(annualFlow?.stemBranch) ? `${annualFlow.stemBranch} 흐름에서는` : "당해 흐름에서는"} 실행 속도보다 실행 일관성을 먼저 고정하세요.`,
      },
    ],
    practicalAdvice: [
      "현재 확인 가능한 핵심 궁을 기준으로 주간 우선순위 1개를 먼저 고정하세요.",
      "감정 강도보다 실행 지속성을 우선하는 루틴을 선택하세요.",
    ],
    cautions: [
      "단기 감정에 반응해 장기 흐름을 훼손하는 결정을 피하세요.",
    ],
    masterConclusion: "주어진 운명 설계도를 믿고, 매 순간 나에게 집중하는 선택을 하십시오. 그것이 가장 강력한 자미두수의 운명 개척법입니다.",
    coreStars: ["자미", "천부"],
    corePalaces: ["ming"],
    missingDataNotice: null,
  };
}

export function sanitizeZiweiChapterJson(rawChapter, chapterSpec) {
  const chapter = toPlainObject(rawChapter);
  const sections = asArray(chapter.sections)
    .map((row) => ({
      heading: sanitizeZiweiOutputText(asText(row?.heading)) || "핵심 해석",
      body: sanitizeZiweiOutputText(asText(row?.body)),
    }))
    .filter((row) => row.body);

  const practicalAdvice = asArray(chapter.practicalAdvice).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const cautions = asArray(chapter.cautions).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  
  const masterConclusion = sanitizeZiweiOutputText(asText(chapter.masterConclusion)) || "인생의 매 순간을 주도적으로 이끌어가며, 지혜로운 선택으로 자신만의 길을 가꾸어가길 응원합니다.";
  const coreStars = asArray(chapter.coreStars).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const corePalaces = asArray(chapter.corePalaces).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);

  return {
    chapterTitle: sanitizeZiweiOutputText(asText(chapter.chapterTitle)) || chapterSpec?.title || "자미두수 해석",
    chapterSubtitle: sanitizeZiweiOutputText(asText(chapter.chapterSubtitle)) || "심층 해석",
    summary: sanitizeZiweiOutputText(asText(chapter.summary)) || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    sections,
    practicalAdvice,
    cautions,
    masterConclusion,
    coreStars: coreStars.length > 0 ? coreStars : ["자미"],
    corePalaces: corePalaces.length > 0 ? corePalaces : ["ming"],
    missingDataNotice: null,
  };
}

function buildStrengthTableMarkdown() {
  const rows = ["| 기호 | 명칭 | 의미 |", "|---|---|---|"];
  ["◎", "○", "△", "▲", "함"].forEach((symbol) => {
    const item = ZIWEI_STAR_STRENGTHS[symbol];
    if (!item) return;
    rows.push(`| ${symbol} | ${item.name}(${item.hanja}) | ${item.meaning} |`);
  });
  return rows.join("\n");
}

function buildPalaceMeaningMarkdown() {
  const rows = ["| 궁 | 한자 | 핵심 |", "|---|---|---|"];
  PALACE_ORDER.forEach((key) => {
    const meaning = ZIWEI_PALACE_MEANINGS[key];
    if (!meaning) return;
    rows.push(`| ${meaning.name} | ${meaning.hanja} | ${meaning.core} |`);
  });
  return rows.join("\n");
}

function buildKnowledgePrelude(context) {
  const bodyPalaceKey = context?.chartMeta?.bodyPalaceKey || "";
  const bodyText = bodyPalaceKey
    ? (ZIWEI_BODY_PALACE_MEANINGS[bodyPalaceKey] || ZIWEI_BODY_PALACE_MEANINGS.general)
    : "신궁 위치가 명확하지 않은 경우의 후천 운명 해석: 명궁-관록궁-재백궁-복덕궁 경향을 종합해 후천 방향성을 해석합니다.";

  return [
    "### 별 강약 기호표",
    buildStrengthTableMarkdown(),
    "### 12궁 기본 의미 요약",
    buildPalaceMeaningMarkdown(),
    "### 신궁 설명",
    bodyText,
    "### 삼방사정 설명",
    `- 대궁: ${ZIWEI_RELATIONSHIP_RULES.opposite}`,
    `- 합궁: ${ZIWEI_RELATIONSHIP_RULES.triangle}`,
    `- 삼방사정: ${ZIWEI_RELATIONSHIP_RULES.sanfangsazheng}`,
  ].join("\n\n");
}

export function buildZiweiChapterMarkdown(chapterJson, chapterSpec, context, includePrelude = false) {
  const chapter = sanitizeZiweiChapterJson(chapterJson, chapterSpec);
  const lines = [];

  if (includePrelude) {
    lines.push(buildKnowledgePrelude(context));
  }

  lines.push(`# ${chapter.chapterTitle}`);
  lines.push(`## ${chapter.chapterSubtitle}`);
  lines.push(chapter.summary);

  if (chapter.coreStars.length || chapter.corePalaces.length) {
    const starsText = chapter.coreStars.length ? chapter.coreStars.join(", ") : "미상";
    const palacesText = chapter.corePalaces.length
      ? chapter.corePalaces.map((key) => ZIWEI_PALACE_MEANINGS[key]?.name || key).join(", ")
      : "미상";
    lines.push(`### 핵심 별/궁 시그널\n- 핵심 별: ${starsText}\n- 핵심 궁: ${palacesText}`);
  }

  if (chapter.sections.length) {
    chapter.sections.forEach((section, index) => {
      lines.push(`### ${section.heading || `Section ${index + 1}`}`);
      if (section.body) lines.push(section.body);
    });
  }

  if (chapter.practicalAdvice.length) {
    lines.push("### 실천 조언");
    chapter.practicalAdvice.forEach((item) => lines.push(`- ${item}`));
  }

  if (chapter.cautions.length) {
    lines.push("### 주의점");
    chapter.cautions.forEach((item) => lines.push(`- ${item}`));
  }

  if (chapter.masterConclusion) {
    lines.push("### 거장의 최종 제언");
    lines.push(chapter.masterConclusion);
  }

  return lines.filter(Boolean).join("\n\n");
}

function trimZiweiMarkdownToMaxLength(text, maxLength) {
  const source = sanitizeZiweiOutputText(String(text || "").trim());
  if (!source || source.length <= maxLength) return source;

  let clipped = source.slice(0, maxLength);
  const candidateCut = Math.max(
    clipped.lastIndexOf("\n\n"),
    clipped.lastIndexOf("다.\n"),
    clipped.lastIndexOf("요.\n"),
    clipped.lastIndexOf(". "),
  );
  if (candidateCut > Math.floor(maxLength * 0.75)) {
    clipped = clipped.slice(0, candidateCut);
  }
  clipped = clipped.replace(/\n{3,}/g, "\n\n").trim();
  if (clipped && !/[.!?。！？]$/.test(clipped)) {
    clipped = `${clipped}.`;
  }
  return sanitizeZiweiOutputText(clipped);
}

export function ensureZiweiChapterMarkdownLength(
  text,
  context,
  minLength = ZIWEI_CHAPTER_MIN_LENGTH,
  maxLength = ZIWEI_CHAPTER_MAX_LENGTH,
) {
  let output = sanitizeZiweiOutputText(String(text || "").trim());
  const safeMin = Math.max(1200, Number.isFinite(Number(minLength)) ? Math.floor(Number(minLength)) : ZIWEI_CHAPTER_MIN_LENGTH);
  const safeMax = Math.max(safeMin, Number.isFinite(Number(maxLength)) ? Math.floor(Number(maxLength)) : ZIWEI_CHAPTER_MAX_LENGTH);
  const bodyPalaceKey = asText(context?.chartMeta?.bodyPalaceKey);
  const palaceLoop = asArray(context?.palaces).slice(0, 12);
  const annualLabel = asText(context?.cycles?.annual?.stemBranch) || "당해 흐름";

  let guard = 0;
  while (output.length < safeMin && guard < 14) {
    const palace = palaceLoop[guard % Math.max(1, palaceLoop.length)] || {};
    const palaceName = asText(palace?.name) || "핵심 궁";
    const keyStar = asText(asArray(palace?.mainStars)[0]?.name) || "핵심 주성";
    const dynamicChunk = [
      `### 실행 확장 분석 ${guard + 1}: ${palaceName}`,
      `${palaceName}에서 ${keyStar}의 작동은 단기 반응보다 중기 운영 원칙을 우선 고정할 때 안정적으로 발현됩니다. 특히 ${annualLabel} 구간에는 결정을 줄이고 실행 반복을 늘리는 방식이 체감 성과를 높입니다.`,
      "실전 기준: 목표를 늘리기보다 손실을 먼저 줄이는 순서로 설계하면, 같은 운에서도 피로 누적과 관계 충돌을 동시에 낮출 수 있습니다.",
      bodyPalaceKey
        ? `신궁(${bodyPalaceKey}) 축은 외부 행동 표현을 보정하는 장치이므로, 관계 대화와 일정 운영의 기준 문장을 미리 정해두면 운의 소모를 줄일 수 있습니다.`
        : "신궁 정보가 제한적일 때는 명궁-관록궁-복덕궁의 상호작용을 기준으로 실행 피로를 관리하세요.",
      "주간 액션: 가장 소모가 큰 선택 패턴 1개를 기록하고, 대체 행동 1개를 같은 시간대에 7일 연속 고정하세요.",
    ].join("\n\n");
    output = `${output}\n\n${dynamicChunk}`;
    guard += 1;
  }

  output = sanitizeZiweiOutputText(output);
  if (output.length > safeMax) {
    output = trimZiweiMarkdownToMaxLength(output, safeMax);
  }

  while (output.length < safeMin && guard < 20) {
    output = `${output}\n\n추가 실행 원칙: 핵심 행동 1개를 7일 단위로 고정하고, 주간 회고에서 유지/중단 항목을 분리해 운영하면 운의 손실을 줄일 수 있습니다.`;
    guard += 1;
  }

  if (output.length > safeMax) {
    output = trimZiweiMarkdownToMaxLength(output, safeMax);
  }
  return sanitizeZiweiOutputText(output);
}

export { ZIWEI_PDF_CHAPTERS, ZIWEI_CHAPTER_SPECS };
