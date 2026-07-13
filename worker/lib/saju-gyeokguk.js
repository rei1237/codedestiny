// 사주 격국(格局)·십이운성(十二運星) 판정 모듈.
//
// worker/lib/saju-ai-prompt.js 가 이 모듈을 import 한다. 순환 참조를 피하기 위해
// 필요한 소형 상수(오행/음양/충 표)는 이 파일 안에 독립적으로 정의한다(중복은
// 작은 frozen 테이블 몇 개뿐이며, 그 대가로 부작용 없는 순수 함수 + 단독 테스트가 가능해진다).
//
// 십이운성 60갑자 조견표(E12_MAP)는 프로덕션 검증된 js/saju-engine.js:8274-8285 값을
// 그대로 복사해 이식했다(재유도하지 않음).

const STEM_ELEMENT_KEY = Object.freeze({
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth",
  己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
});
const STEM_POLARITY = Object.freeze({
  甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang",
  己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin",
});
const STEM_KO = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});
const BRANCH_KO = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});
const BRANCH_ELEMENT_KEY = Object.freeze({
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
});
const ELEMENT_KO_BY_KEY = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const ELEMENT_KEY_BY_KO = Object.freeze({ 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" });
const ELEMENT_GENERATES = Object.freeze({ wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" });
const ELEMENT_CONTROLS = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
const CHUNG_PAIRS = Object.freeze({
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
});

// 십이운성 조견표 (일간 + 지지 → 운성). js/saju-engine.js:8274-8285 원본과 1:1.
const TWELVE_LIFE_STAGE_MAP = Object.freeze({
  甲亥: "장생", 甲子: "목욕", 甲丑: "관대", 甲寅: "건록", 甲卯: "제왕", 甲辰: "쇠", 甲巳: "병", 甲午: "사", 甲未: "묘", 甲申: "절", 甲酉: "태", 甲戌: "양",
  乙午: "장생", 乙巳: "목욕", 乙辰: "관대", 乙卯: "건록", 乙寅: "제왕", 乙丑: "쇠", 乙子: "병", 乙亥: "사", 乙戌: "묘", 乙酉: "절", 乙申: "태", 乙未: "양",
  丙寅: "장생", 丙卯: "목욕", 丙辰: "관대", 丙巳: "건록", 丙午: "제왕", 丙未: "쇠", 丙申: "병", 丙酉: "사", 丙戌: "묘", 丙亥: "절", 丙子: "태", 丙丑: "양",
  戊寅: "장생", 戊卯: "목욕", 戊辰: "관대", 戊巳: "건록", 戊午: "제왕", 戊未: "쇠", 戊申: "병", 戊酉: "사", 戊戌: "묘", 戊亥: "절", 戊子: "태", 戊丑: "양",
  丁酉: "장생", 丁申: "목욕", 丁未: "관대", 丁午: "건록", 丁巳: "제왕", 丁辰: "쇠", 丁卯: "병", 丁寅: "사", 丁丑: "묘", 丁子: "절", 丁亥: "태", 丁戌: "양",
  己酉: "장생", 己申: "목욕", 己未: "관대", 己午: "건록", 己巳: "제왕", 己辰: "쇠", 己卯: "병", 己寅: "사", 己丑: "묘", 己子: "절", 己亥: "태", 己戌: "양",
  庚巳: "장생", 庚午: "목욕", 庚未: "관대", 庚申: "건록", 庚酉: "제왕", 庚戌: "쇠", 庚亥: "병", 庚子: "사", 庚丑: "묘", 庚寅: "절", 庚卯: "태", 庚辰: "양",
  辛子: "장생", 辛亥: "목욕", 辛戌: "관대", 辛酉: "건록", 辛申: "제왕", 辛未: "쇠", 辛午: "병", 辛巳: "사", 辛辰: "묘", 辛卯: "절", 辛寅: "태", 辛丑: "양",
  壬申: "장생", 壬酉: "목욕", 壬戌: "관대", 壬亥: "건록", 壬子: "제왕", 壬丑: "쇠", 壬寅: "병", 壬卯: "사", 壬辰: "묘", 壬巳: "절", 壬午: "태", 壬未: "양",
  癸卯: "장생", 癸寅: "목욕", 癸丑: "관대", 癸子: "건록", 癸亥: "제왕", 癸戌: "쇠", 癸酉: "병", 癸申: "사", 癸未: "묘", 癸午: "절", 癸巳: "태", 癸辰: "양",
});

const GEOK_BY_TEN_GOD = Object.freeze({
  정관: "정관격", 편관: "편관격", 정재: "정재격", 편재: "편재격",
  식신: "식신격", 상관: "상관격", 정인: "정인격", 편인: "편인격",
});

// 지장간 layer(정기/중기/여기)별 격 성립 가중치.
const LAYER_WEIGHT = Object.freeze({ 정기: 1.2, 중기: 0.65, 여기: 0.35 });
const EXPOSURE_BONUS = 2.2; // 월지 지장간이 천간에 투출되면 격이 뚜렷해진다.

function normalizeStemChar(value) {
  const text = String(value == null ? "" : value).trim();
  for (const stem of Object.keys(STEM_ELEMENT_KEY)) {
    if (text.includes(stem)) return stem;
  }
  return "";
}

function normalizeBranchChar(value) {
  const text = String(value == null ? "" : value).trim();
  for (const branch of Object.keys(BRANCH_ELEMENT_KEY)) {
    if (text.includes(branch)) return branch;
  }
  return "";
}

function normalizeElementKey(value) {
  const text = String(value == null ? "" : value).trim().toLowerCase();
  if (!text) return "";
  if (ELEMENT_KO_BY_KEY[text]) return text;
  for (const [ko, key] of Object.entries(ELEMENT_KEY_BY_KO)) {
    if (text.includes(ko)) return key;
  }
  for (const key of ["wood", "fire", "earth", "metal", "water"]) {
    if (text.includes(key)) return key;
  }
  return "";
}

function getTenGodFromDayMaster(dayStem, targetStem) {
  const day = normalizeStemChar(dayStem);
  const target = normalizeStemChar(targetStem);
  const dayElement = STEM_ELEMENT_KEY[day];
  const targetElement = STEM_ELEMENT_KEY[target];
  if (!day || !target || !dayElement || !targetElement) return "";
  const samePolarity = STEM_POLARITY[day] === STEM_POLARITY[target];
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if (ELEMENT_GENERATES[dayElement] === targetElement) return samePolarity ? "식신" : "상관";
  if (ELEMENT_GENERATES[targetElement] === dayElement) return samePolarity ? "편인" : "정인";
  if (ELEMENT_CONTROLS[dayElement] === targetElement) return samePolarity ? "편재" : "정재";
  if (ELEMENT_CONTROLS[targetElement] === dayElement) return samePolarity ? "편관" : "정관";
  return "";
}

/**
 * 일간 + 지지 → 십이운성(장생~양). 미상이면 "".
 */
export function getTwelveLifeStage(dayStem, branch) {
  const day = normalizeStemChar(dayStem);
  const zhi = normalizeBranchChar(branch);
  if (!day || !zhi) return "";
  return TWELVE_LIFE_STAGE_MAP[`${day}${zhi}`] || "";
}

/**
 * 연/월/일/시 4주 각 지지의 십이운성 배열.
 * pillarRows: [{ position, stem, branch }]
 */
export function buildTwelveLifeStagesForPillars(pillarRows, dayStem) {
  const rows = Array.isArray(pillarRows) ? pillarRows : [];
  const day = normalizeStemChar(dayStem);
  return rows
    .map((row) => {
      const branch = normalizeBranchChar(row?.branch);
      const stage = getTwelveLifeStage(day, branch);
      return {
        position: row?.position || "",
        branch,
        branchKo: BRANCH_KO[branch] || "",
        stage,
        stageKo: stage,
      };
    })
    .filter((row) => row.branch);
}

function collectAllTenGods(pillarRows, hiddenStems, dayStem) {
  const present = new Set();
  const day = normalizeStemChar(dayStem);
  (Array.isArray(pillarRows) ? pillarRows : []).forEach((row) => {
    if (row?.position === "day") return; // 일간 자신은 제외
    const tenGod = getTenGodFromDayMaster(day, row?.stem);
    if (tenGod) present.add(tenGod);
  });
  (Array.isArray(hiddenStems) ? hiddenStems : []).forEach((item) => {
    const tenGod = item?.tenGodFromDayMaster || getTenGodFromDayMaster(day, item?.hiddenStem);
    if (tenGod) present.add(tenGod);
  });
  return present;
}

function buildLuckTiming(luckRows, power, jong, dayStem) {
  const rows = Array.isArray(luckRows) ? luckRows : [];
  const p = power && typeof power === "object" ? power : {};
  const yongshin = new Set(
    []
      .concat(Array.isArray(p.yongshin) ? p.yongshin : [])
      .concat(Array.isArray(p.yongsin) ? p.yongsin : [])
      .map(normalizeElementKey)
      .filter(Boolean),
  );
  const kijishin = new Set(
    []
      .concat(Array.isArray(p.kijishin) ? p.kijishin : [])
      .concat(Array.isArray(p.gisin) ? p.gisin : [])
      .concat(Array.isArray(p.gishin) ? p.gishin : [])
      .map(normalizeElementKey)
      .filter(Boolean),
  );
  if (!yongshin.size && !kijishin.size) {
    return { activated: [], broken: [], note: "용신/기신 정보가 없어 격국 활성화·파격 시기는 참고용으로만 제시합니다." };
  }

  const activated = [];
  const broken = [];
  rows.forEach((row) => {
    const scopeKo = row?.scope === "daewoon" ? "대운" : row?.scope === "sewoon" ? "세운" : "운";
    const label = String(row?.label || `${row?.stem || ""}${row?.branch || ""}`).trim();
    const elements = [
      STEM_ELEMENT_KEY[normalizeStemChar(row?.stem)],
      BRANCH_ELEMENT_KEY[normalizeBranchChar(row?.branch)],
    ].filter(Boolean);
    const helps = elements.some((el) => yongshin.has(el));
    const hurts = elements.some((el) => kijishin.has(el));
    if (helps && !hurts) {
      activated.push({ scope: scopeKo, label, reason: `${label} 시기는 용신 오행이 들어와 격을 돕습니다.` });
    } else if (hurts && !helps) {
      broken.push({ scope: scopeKo, label, reason: `${label} 시기는 기신 오행이 들어와 격이 흔들릴 수 있습니다.` });
    }
  });

  return { activated: activated.slice(0, 6), broken: broken.slice(0, 6), note: "" };
}

/**
 * 격국 판정.
 * 입력은 모두 optional-safe(누락 시 부분 판정 + 참고 플래그).
 *   pillarRows            [{ position, stem, branch }]
 *   dayStem               일간(한자)
 *   hiddenStems           buildSajuHiddenStemItems 결과 [{ position, branch, hiddenStem, layer, weight, tenGodFromDayMaster }]
 *   hiddenStemExposures   buildSajuHiddenStemExposures 결과 [{ hiddenStem, exposedInNatalHeavenlyStem, ... }]
 *   power                 { yongshin, kijishin, isStrong }
 *   jong                  { isJong, name }
 *   luckRows              normalizeSajuLuckRows 결과 [{ scope, stem, branch, label }]
 *   doChung               { exists, ... }
 *   earthStorageOpenings  [{ sourceBranch, triggerBranch, relationType }]
 */
export function buildGyeokgukAnalysis({
  pillarRows,
  dayStem,
  hiddenStems,
  hiddenStemExposures,
  power,
  jong,
  luckRows,
  doChung,
  earthStorageOpenings,
} = {}) {
  const rows = Array.isArray(pillarRows) ? pillarRows : [];
  const day = normalizeStemChar(dayStem) || normalizeStemChar(rows.find((r) => r?.position === "day")?.stem);
  const monthRow = rows.find((r) => r?.position === "month") || {};
  const monthBranch = normalizeBranchChar(monthRow.branch);
  const monthBranchKo = BRANCH_KO[monthBranch] || "";

  const exposedSet = new Set(
    (Array.isArray(hiddenStemExposures) ? hiddenStemExposures : [])
      .filter((row) => row?.exposedInNatalHeavenlyStem)
      .map((row) => normalizeStemChar(row?.hiddenStem))
      .filter(Boolean),
  );

  const monthHidden = (Array.isArray(hiddenStems) ? hiddenStems : [])
    .filter((item) => item?.position === "month" && normalizeBranchChar(item?.branch) === monthBranch)
    .map((item) => {
      const hiddenStem = normalizeStemChar(item?.hiddenStem);
      const tenGod = item?.tenGodFromDayMaster || getTenGodFromDayMaster(day, hiddenStem);
      const exposed = exposedSet.has(hiddenStem);
      const layerWeight = LAYER_WEIGHT[item?.layer] ?? 0.35;
      const geok = GEOK_BY_TEN_GOD[tenGod] || null;
      const score = Number((layerWeight + (exposed ? EXPOSURE_BONUS : 0)).toFixed(2));
      return {
        hiddenStem,
        hiddenStemKo: STEM_KO[hiddenStem] || "",
        layer: item?.layer || "",
        tenGod,
        exposed,
        geok,
        score,
      };
    });

  const monthHiddenSummary = monthHidden.map((row) => ({
    stem: row.hiddenStem,
    stemKo: row.hiddenStemKo,
    layer: row.layer,
    tenGod: row.tenGod,
    exposed: row.exposed,
  }));

  // 격 후보(비견/겁재는 정규 격이 없으므로 제외).
  const candidates = monthHidden
    .filter((row) => row.geok)
    .sort((a, b) => b.score - a.score)
    .map((row) => ({
      name: row.geok,
      tenGod: row.tenGod,
      layer: row.layer,
      exposed: row.exposed,
      score: row.score,
    }));

  // 월지 정기(본기) 십성 — 건록격/양인격/월겁격 판정 기준.
  const mainQi = monthHidden.find((row) => row.layer === "정기") || monthHidden[0] || null;
  const monthStage = getTwelveLifeStage(day, monthBranch);
  const dayIsYang = STEM_POLARITY[day] === "yang";

  let finalGyeokguk = "";
  let finalType = "일반격";
  let judgmentReason = "";
  let confident = true;

  if (jong && jong.isJong) {
    finalGyeokguk = String(jong.name || "종격").trim() || "종격";
    finalType = "특수격";
    judgmentReason = "일간이 극도로 편중되어 종격(특수격)으로 성립합니다. 정기·투출보다 세력의 종속이 우선입니다.";
  } else if (mainQi && (mainQi.tenGod === "비견" || mainQi.tenGod === "겁재")) {
    // 월령 본기가 일간과 같은 오행 → 정규 격 대신 건록/양인/월겁 구조.
    if (monthStage === "건록") {
      finalGyeokguk = "건록격";
      judgmentReason = `월지 ${monthBranchKo}가 일간 ${STEM_KO[day] || day}의 건록 자리라 건록격으로 봅니다.`;
    } else if (monthStage === "제왕" && dayIsYang) {
      finalGyeokguk = "양인격";
      judgmentReason = `월지 ${monthBranchKo}가 양간 일간의 제왕(양인) 자리라 양인격으로 봅니다.`;
    } else {
      finalGyeokguk = "월겁격";
      judgmentReason = `월령 본기가 ${mainQi.tenGod}이라 정규 격 대신 월겁격(신강 구조)으로 봅니다.`;
    }
    finalType = "특수격";
  } else if (candidates.length) {
    const best = candidates[0];
    finalGyeokguk = best.name;
    finalType = "일반격";
    judgmentReason = best.exposed
      ? `월지 ${monthBranchKo} 지장간의 ${best.tenGod}이 천간에 투출되어 ${best.name}이 뚜렷합니다.`
      : `월지 ${monthBranchKo} 지장간의 ${best.tenGod}을 기준으로 ${best.name}으로 보되, 투출이 약해 확정도는 낮습니다.`;
    if (!best.exposed) confident = false;
  } else {
    finalGyeokguk = "미정";
    finalType = "참고";
    judgmentReason = "월지 지장간에서 뚜렷한 정규 격이 성립하지 않아, 억부·조후 흐름으로 보완해 읽습니다.";
    confident = false;
  }

  // 파격 요소.
  const breakFactors = [];
  const presentTenGods = collectAllTenGods(rows, hiddenStems, day);
  if (presentTenGods.has("정관") && presentTenGods.has("편관")) {
    breakFactors.push({ type: "관살혼잡", detail: "정관과 편관이 함께 있어 관성이 혼잡합니다. 진로·조직·규율의 갈등 신호." });
  }
  if (monthBranch && CHUNG_PAIRS[monthBranch]) {
    const chungTarget = CHUNG_PAIRS[monthBranch];
    const chungHit = rows.some((r) => r?.position !== "month" && normalizeBranchChar(r?.branch) === chungTarget);
    if (chungHit) {
      breakFactors.push({ type: "월지충", detail: `월지 ${monthBranchKo}가 ${BRANCH_KO[chungTarget] || chungTarget}와 충하여 격의 뿌리가 흔들립니다.` });
    }
  }
  if (doChung && doChung.exists) {
    breakFactors.push({ type: "도충", detail: `${doChung.repeatedBranch || ""} 반복으로 유도된 충(${doChung.inducedOppositeBranch || "미상"})이 격에 사건성을 더합니다.` });
  }
  if (Array.isArray(earthStorageOpenings) && earthStorageOpenings.length) {
    const opening = earthStorageOpenings[0];
    breakFactors.push({ type: "개고", detail: `${opening.sourceBranch || ""}-${opening.triggerBranch || ""} ${opening.relationType || ""}로 창고가 열려 격의 재료가 드러납니다.` });
  }

  const luckTiming = buildLuckTiming(luckRows, power, jong, day);

  return {
    finalGyeokguk,
    finalType,
    judgmentReason,
    confident,
    monthBranch,
    monthBranchKo,
    monthHiddenStems: monthHiddenSummary,
    candidates: candidates.slice(0, 3),
    breakFactors,
    luckTiming,
  };
}
