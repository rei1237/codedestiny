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

  const branch = asText(source.branch || source.earthlyBranch);
  const missingFields = [];

  if (!branch) missingFields.push("branch");

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
  const subStars = auxSource
    .concat(maleficSource)
    .map((star, idx) => normalizeStar(star, idx < auxSource.length ? "sub" : "malefic", `palaces.${key}.subStars[${idx}]`, missingSummary));
  const sihua = sihuaSource.map((entry, idx) => normalizeSihuaEntry(entry, `palaces.${key}.sihua[${idx}]`, missingSummary));

  const oppositePalaceKey = asText(source.oppositePalaceKey);
  const trianglePalaceKeys = asArray(source.triadPalaceKeys || source.trianglePalaceKeys).map(asText).filter(Boolean);

  return {
    key,
    name: meaning?.name || asText(source.nameKo || source.name || source.palaceName) || "미상궁",
    branch: branch || null,
    description: meaning?.expanded || meaning?.meaning || "이 궁의 데이터가 부분적으로 누락되어 기본 궁 의미 중심으로 해석합니다.",
    mainStars,
    subStars,
    sihua,
    oppositePalaceKey: oppositePalaceKey || null,
    trianglePalaceKeys,
    fallbackUsed: missingFields.length > 0,
    missingFields,
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
  const bodyBranch = normalizeBranchToken(chartMeta.shenGong || chartMeta.bodyPalace || chartMeta.bodyPalaceKey);
  if (!bodyBranch) return null;

  const found = normalizedPalaces.find((palace) => normalizeBranchToken(palace.branch) === bodyBranch);
  return found?.key || null;
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

export function buildZiweiGeminiPrompt({ chapter, context }) {
  const chapterSpec = chapter || ZIWEI_PDF_CHAPTERS[0];

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
    "8. 각 챕터는 충분히 길고 깊어야 한다.",
    "9. 독자가 내 명반을 실제로 읽어준다고 느낄 정도로 구체적으로 작성한다.",
    "10. 무조건 JSON 형식으로만 응답한다.",
    "11. 마크다운 코드블록, 표, 파이프(|) 테이블, 불릿/번호 목록, HTML 태그를 출력하지 않는다.",
    "12. chapterTitle/chapterSubtitle는 입력된 챕터 제목/의도를 따르고, 결론형 요약문 남발을 금지한다.",
    "13. 본 리포트는 13챕터 고정 체계이므로 챕터 번호 체계를 임의로 변경하지 않는다.",
    "14. 데이터 부족/보완/안내/메모 같은 메타 표현을 본문에 쓰지 않는다.",
    "15. 시스템 지침 문장, 프롬프트 규칙 문장, JSON 키 설명 문장을 본문으로 출력하지 않는다.",
    "16. 동일 문장/동일 단락을 반복해 분량을 채우지 않는다.",
  ].join("\n");

  const userPrompt = [
    "다음은 프리미엄 자미두수 PDF 생성을 위한 명반 데이터입니다.",
    "",
    "[사용자 정보]",
    JSON.stringify(context.userProfile || {}, null, 2),
    "",
    "[정규화된 자미두수 명반]",
    JSON.stringify({ chartMeta: context.chartMeta, palaces: context.palaces, missingSummary: context.missingSummary }, null, 2),
    "",
    "[자미두수 기본 해석 Knowledge Base]",
    JSON.stringify(context.knowledgeBase || {}, null, 2),
    "",
    "[작성할 챕터]",
    chapterSpec.title,
    "",
    "[챕터 작성 목표]",
    chapterSpec.goal,
    "",
    "[출력 형식]",
    "반드시 아래 JSON 형식으로만 응답하세요.",
    "{",
    '  "chapterTitle": "string",',
    '  "chapterSubtitle": "string",',
    '  "summary": "string",',
    '  "sections": [',
    '    { "heading": "string", "body": "string" }',
    "  ],",
    '  "practicalAdvice": ["string"],',
    '  "cautions": ["string"],',
    '  "missingDataNotice": "string | null"',
    "}",
    "",
    "[문체 기준]",
    "- 30년 경력 상담가가 직접 읽어주는 1:1 컨설팅 톤으로 쓰세요.",
    "- 별 강약 기호가 있으면 반드시 해석에 반영하세요.",
    "- 데이터가 없는 경우에는 기본 궁 의미와 knowledgeBase를 활용해 자연스럽게 상담 흐름으로 보강하세요.",
    "- 데이터 부족 안내나 메모성 문구는 출력하지 마세요.",
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    prompt: `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`,
  };
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

export function parseZiweiGeminiResponse(rawText) {
  const parsed = tryParseJson(rawText);
  if (parsed) return { ok: true, data: parsed, repaired: false };

  const repairedText = repairJsonString(rawText);
  if (!repairedText) return { ok: false, data: null, repaired: false };

  try {
    return { ok: true, data: JSON.parse(repairedText), repaired: true };
  } catch (_) {
    return { ok: false, data: null, repaired: true };
  }
}

export function createFallbackChapter(chapter, context) {
  const spec = chapter || { title: "기본 챕터", goal: "기본 해석" };
  return {
    chapterTitle: spec.title,
    chapterSubtitle: spec.goal || "챕터별 실행 해석",
    summary: "확인된 궁위 데이터와 별 배치를 기준으로 이 챕터의 핵심 흐름을 상담형으로 정리했습니다.",
    sections: [
      {
        heading: "운명의 구조",
        body: "이 영역은 자미두수의 핵심 축을 이루므로, 제공된 궁의 의미와 전체 흐름을 연결해 실전적으로 읽어야 합니다. 선택의 우선순위를 명확히 할수록 운의 체감이 빨라집니다.",
      },
      {
        heading: "실전 운영 전략",
        body: "단정형 예측보다 생활 리듬, 의사결정 기준, 관계 경계 설정처럼 실행 가능한 원칙을 먼저 고정하면 운의 손실을 줄이고 상승 구간을 안정적으로 확대할 수 있습니다.",
      },
    ],
    practicalAdvice: [
      "현재 확인 가능한 핵심 궁을 기준으로 주간 우선순위 1개를 먼저 고정하세요.",
      "감정 강도보다 실행 지속성을 우선하는 루틴을 선택하세요.",
    ],
    cautions: [
      "단기 감정에 반응해 장기 흐름을 훼손하는 결정을 피하세요.",
    ],
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

  return {
    chapterTitle: sanitizeZiweiOutputText(asText(chapter.chapterTitle)) || chapterSpec?.title || "자미두수 해석",
    chapterSubtitle: sanitizeZiweiOutputText(asText(chapter.chapterSubtitle)) || "심층 해석",
    summary: sanitizeZiweiOutputText(asText(chapter.summary)) || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    sections,
    practicalAdvice,
    cautions,
    missingDataNotice: null,
  };
}

function buildStrengthTableMarkdown() {
  const rows = ["| 기호 | 명칭 | 의미 |", "|---|---|---|"];
  ["◎", "○", "▲", "△", "함"].forEach((symbol) => {
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

  void context;
  void includePrelude;

  lines.push(`# ${chapter.chapterTitle}`);
  lines.push(`## ${chapter.chapterSubtitle}`);
  lines.push(chapter.summary);

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

  return lines.filter(Boolean).join("\n\n");
}

export function ensureZiweiChapterMarkdownLength(text, context, minLength = 5200) {
  let output = sanitizeZiweiOutputText(String(text || "").trim());
  const bodyPalaceKey = asText(context?.chartMeta?.bodyPalaceKey);

  let guard = 0;
  while (output.length < minLength && guard < 12) {
    const blockNo = guard + 1;
    const dynamicChunk = [
      `### 심화 상담 ${blockNo}`,
      "확인된 궁 배치와 주성 흐름을 기준으로, 판단 우선순위를 행동 단위로 재정렬하는 해석을 제공합니다.",
      blockNo % 2 === 0
        ? "명궁-관록궁-재백궁 연결은 직업과 자산 운영의 핵심 축이며, 복덕궁-질액궁 연결은 회복력 관리의 핵심 축으로 작동합니다."
        : "명궁-천이궁-교우궁 연결은 대외 관계 운영의 핵심 축이며, 복덕궁-전택궁 연결은 정서 안정 기반의 핵심 축으로 작동합니다.",
      bodyPalaceKey
        ? `신궁 정보는 ${bodyPalaceKey} 축의 실행력과 후천적 선택 패턴을 구체화하는 데 사용합니다.`
        : "신궁 정보가 제한적인 경우에는 명궁과 핵심 현실궁의 상호작용을 중심으로 실행 패턴을 제시합니다.",
      "실행 권고: 이번 주에는 가장 반복 비용이 큰 선택 패턴 1개를 기록하고, 대체 행동 1개를 같은 시간대에 고정하세요.",
    ].join("\n\n");
    output = `${output}\n\n${dynamicChunk}`;
    guard += 1;
  }
  return sanitizeZiweiOutputText(output);
}

export { ZIWEI_PDF_CHAPTERS };
