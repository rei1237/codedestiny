import { Solar } from "lunar-javascript";
// 화성·영성 기점은 셸·워커 엔진과 공유한다(lib/ziwei-fire-bell.js 머리말 참고).
import { placeFireAndBell } from "@/lib/ziwei-fire-bell";
import { generateZiweiDeepSummary } from "./generate-ziwei-deep-summary";
import {
  calculateFourTransformations,
  FOUR_TRANSFORMATIONS_BY_YEAR_STEM,
  getOppositePalaceIndex,
  getSanFangSiZhengIndexes,
  normalizePalaceName,
  normalizeYearStem,
  type FourTransformation,
  transformationTypeToLabel,
  ZIWEI_ENGINE_VERSION,
} from "./ziwei-advanced-normalization";
import {
  getZiweiClassicalStrength,
  normalizeZiweiClassicStrength,
  ziweiClassicStrengthFromSymbol,
  ziweiClassicStrengthToSymbol,
  type ZiweiClassicStrength,
  type ZiweiStrengthSymbol,
} from "./ziwei-strength";
import {
  ZiweiCanonicalPalace,
  ZiweiCanonicalStar,
  ZiweiDeepAnalysisInput,
  ZiweiDeepChart,
  ZiweiPalace,
  ZiweiPalaceId,
  ZiweiStarMeta,
  ZiweiUserInput,
} from "./ziwei-types";

/** 자미두수 지지 목록 */
export const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
/** 자미두수 천간 목록 */
export const GAN_LIST = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];

const HAN_TO_KR_GAN: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};

const HAN_TO_KR_ZHI: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};

export interface ZiweiStar {
  name: string;
  symbol: string;
  strength?: string;
}

export interface ZiweiPalaceData {
  palace: string;
  branch: string;
  stars: ZiweiStar[];
  auxStars: ZiweiStar[];
  badStars: ZiweiStar[];
  dahan: string; // "14-23" 등
}

export interface ZiweiChartData {
  meng: string;
  body: string;
  yearGan: string;
  yearZhi: string;
  juInfo: string;
  palaceStarData: ZiweiPalaceData[];
  sihua: { luk: string; quan: string; ke: string; ji: string };
}

function normalizePalaceIndex(index: number): number {
  return ((index % 12) + 12) % 12;
}

function normalizeStrengthLabel(raw: string | undefined): string {
  return normalizeZiweiClassicStrength(raw);
}

function normalizeStrengthSymbol(raw: string | undefined): ZiweiStrengthSymbol {
  return ziweiClassicStrengthToSymbol(ziweiClassicStrengthFromSymbol(raw));
}

function symbolFromStrength(strength: string | undefined): ZiweiStrengthSymbol {
  return ziweiClassicStrengthToSymbol(normalizeStrengthLabel(strength));
}

function normalizeStarStrength(strength: string | undefined, symbol: string | undefined): { strength: string; symbol: ZiweiStrengthSymbol } {
  const normalizedStrength = normalizeStrengthLabel(strength) as ZiweiClassicStrength;
  const normalizedSymbol = normalizeStrengthSymbol(symbol);
  const symbolStrength = ziweiClassicStrengthFromSymbol(normalizedSymbol || symbol);
  const resolvedStrength = normalizedStrength || symbolStrength;
  const resolvedSymbol = normalizedSymbol || symbolFromStrength(resolvedStrength);

  if (!resolvedStrength || !resolvedSymbol) {
    return { strength: "", symbol: "" };
  }

  return { strength: resolvedStrength, symbol: resolvedSymbol };
}

/** 
 * 자미두수 전문 계산 엔진 
 * (saju-engine.js 기반 TypeScript 이식)
 */
export function calcZiweiPalaces(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: "M" | "F"
): ZiweiChartData {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  const lYear = lunar.getYear();
  const lMonth = Math.abs(lunar.getMonth());
  const lDay = lunar.getDay();
  
  const yGanRaw = String(lunar.getYearGan() || "");
  const yZhiRaw = String(lunar.getYearZhi() || "");
  const yGan = HAN_TO_KR_GAN[yGanRaw] || yGanRaw;
  const yZhi = HAN_TO_KR_ZHI[yZhiRaw] || yZhiRaw;
  let gIdx = GAN_LIST.indexOf(yGan);
  let zIdx = ZHI_LIST.indexOf(yZhi);
  if (gIdx < 0) gIdx = ((lYear - 4) % 10 + 10) % 10;
  if (zIdx < 0) zIdx = ((lYear - 4) % 12 + 12) % 12;
  
  // 시지 index (자시=0, 축시=1 ...)
  const hIdx = (hour === 23 || hour === 0) ? 0 : Math.floor((hour + 1) / 2);

  // 명궁/신궁 계산
  const baseIdx = (2 + lMonth - 1) % 12; // 인월 기점
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const PALACE_LABELS = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "교우궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
  const palacesByIndex: string[] = new Array(12);
  const palaceStarData: ZiweiPalaceData[] = Array.from({ length: 12 }, (_, i) => ({
    palace: "",
    branch: ZHI_LIST[i],
    stars: [],
    auxStars: [],
    badStars: [],
    dahan: ""
  }));

  for (let i = 0; i < 12; i++) {
    const pIdx = (mingIdx - i + 12) % 12;
    palacesByIndex[pIdx] = PALACE_LABELS[i];
    palaceStarData[pIdx].palace = PALACE_LABELS[i];
  }

  // 오행국 계산
  const inStart = [2, 4, 6, 8, 0][((gIdx % 5) + 5) % 5];
  const mgGan = GAN_LIST[(inStart + (mingIdx - 2 + 12) % 12) % 10];
  const sMap: Record<string, number> = { '갑': 1, '을': 1, '병': 2, '정': 2, '무': 3, '기': 3, '경': 4, '신': 4, '임': 5, '계': 5 };
  const bMap: Record<number, number> = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
  let wVal = sMap[mgGan] + bMap[mingIdx];
  if (wVal > 5) wVal -= 5;
  const juMap: Record<number, number> = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
  const ju = juMap[wVal] || 4; 
  // 오국 명칭은 국수(局數)에 고정된다 — 2국=수2국, 3국=목3국, 4국=금4국, 5국=토5국, 6국=화6국.
  // 🔴 예전에는 2·3·6 이 서로 밀려 있어서, 대한이 3세에 시작하는 목3국 명반에 "화6국"이라 적혔다.
  // 셸(js/saju-engine.js 의 juNames)·워커(calculateBureau 의 bureauName)와 이제 같다.
  const juLabels: Record<number, string> = { 2: "수2국", 3: "목3국", 4: "금4국", 5: "토5국", 6: "화6국" };

  // 주성 배치
  let q = Math.floor(lDay / ju);
  let r = lDay % ju;
  let add = 0;
  if (r !== 0) { add = ju - r; q = Math.floor((lDay + add) / ju); }
  let pos = q;
  if (add > 0) {
    if (add % 2 === 1) pos = q - add;
    else pos = q + add;
  }
  while (pos <= 0) pos += 12;
  while (pos > 12) pos -= 12;
  const ziweiPos = (pos + 1) % 12;
  const tianfuPos = (16 - ziweiPos) % 12;

  const addStar = (pIdx: number, name: string, type: "main" | "aux" | "bad") => {
    const normalizedIndex = normalizePalaceIndex(pIdx);
    const target = palaceStarData[normalizedIndex];
    const profile = getBrightness(name, normalizedIndex, type);
    const normalized = normalizeStarStrength(profile.strength, profile.symbol);
    const star = { name, symbol: normalized.symbol, strength: normalized.strength };
    if (type === "main") target.stars.push(star);
    else if (type === "aux") target.auxStars.push(star);
    else target.badStars.push(star);
  };

  // 14주성
  addStar(ziweiPos, "자미", "main");
  addStar(ziweiPos + 11, "천기", "main");
  addStar(ziweiPos + 9, "태양", "main");
  addStar(ziweiPos + 8, "무곡", "main");
  addStar(ziweiPos + 7, "천동", "main");
  addStar(ziweiPos + 4, "염정", "main");
  
  addStar(tianfuPos, "천부", "main");
  addStar(tianfuPos + 1, "태음", "main");
  addStar(tianfuPos + 2, "탐랑", "main");
  addStar(tianfuPos + 3, "거문", "main");
  addStar(tianfuPos + 4, "천상", "main");
  addStar(tianfuPos + 5, "천량", "main");
  addStar(tianfuPos + 6, "칠살", "main");
  addStar(tianfuPos + 10, "파군", "main");

  // 보좌성/살성
  addStar(10 - hIdx, "문창", "aux");
  addStar(4 + hIdx, "문곡", "aux");
  addStar(4 + (lMonth - 1), "좌보", "aux");
  addStar(10 - (lMonth - 1), "우필", "aux");
  
  const luCunMap = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const luCunPos = luCunMap[gIdx];
  if (Number.isFinite(luCunPos)) {
    addStar(luCunPos, "녹존", "aux");
    addStar(luCunPos + 1, "경양", "bad");
    addStar(luCunPos + 11, "타라", "bad");
  }

  // 천괴(天魁)·천월(天鉞) — 생년간 규칙표. 셸 js/saju-engine.js 의 kuiMap·yueMap 과 같은 값이다.
  const kuiYueMap: [number, number][] = [
    [1, 7],   // 갑 → 丑·未
    [0, 8],   // 을 → 子·申
    [11, 9],  // 병 → 亥·酉
    [11, 9],  // 정 → 亥·酉
    [1, 7],   // 무 → 丑·未
    [0, 8],   // 기 → 子·申
    [1, 7],   // 경 → 丑·未
    [2, 6],   // 신 → 寅·午
    [3, 5],   // 임 → 卯·巳
    [3, 5],   // 계 → 卯·巳
  ];
  const kuiYue = kuiYueMap[gIdx];
  if (kuiYue) {
    addStar(kuiYue[0], "천괴", "aux");
    addStar(kuiYue[1], "천월", "aux");
  }

  // 천마(天馬) — 역마 규칙. 申子辰→寅(2), 巳酉丑→亥(11), 寅午戌→申(8), 亥卯未→巳(5).
  addStar([2, 11, 8, 5][zIdx % 4], "천마", "aux");

  addStar(11 - hIdx, "지공", "bad");
  addStar(11 + hIdx, "지겁", "bad");

  // 화성(火星)·영성(鈴星) — 두 별은 각자의 기점에서 시지만큼 순행한다.
  const fireBell = placeFireAndBell({ yearBranchIndex: zIdx, hourIndex: hIdx });
  addStar(fireBell.fireBranchIndex, "화성", "bad");
  addStar(fireBell.bellBranchIndex, "영성", "bad");

  // 사화(생년간 기준 중앙 상수)
  const stem = normalizeYearStem(yGan) as keyof typeof FOUR_TRANSFORMATIONS_BY_YEAR_STEM;
  const stemTransform = FOUR_TRANSFORMATIONS_BY_YEAR_STEM[stem];
  const [luk, quan, ke, ji] = stemTransform
    ? [stemTransform.록, stemTransform.권, stemTransform.과, stemTransform.기]
    : ["", "", "", ""];

  // 대한
  const isYang = [0, 2, 4, 6, 8].includes(gIdx);
  const isMale = gender === "M";
  const dir = (isYang === isMale) ? 1 : -1;
  for (let i = 0; i < 12; i++) {
    const pIdx = (mingIdx + i * dir + 120) % 12;
    const start = ju + i * 10;
    palaceStarData[pIdx].dahan = `${start}-${start + 9}`;
  }

  return {
    meng: ZHI_LIST[mingIdx],
    body: ZHI_LIST[shenIdx],
    yearGan: yGan,
    yearZhi: yZhi,
    juInfo: juLabels[ju],
    palaceStarData,
    sihua: { luk, quan, ke, ji }
  };
}

/** 묘/득/리/평/함/실 canonical 간략화 로직 */
function getBrightness(star: string, branch: number, starType: "main" | "aux" | "bad"): { strength: string; symbol: ZiweiStrengthSymbol } {
  const zhiHan = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][(branch % 12 + 12) % 12];
  const classical = getZiweiClassicalStrength(star, zhiHan);
  if (classical) {
    return normalizeStarStrength(classical, symbolFromStrength(classical));
  }

  // 고전표에 없는 별은 기존 branch 기반 프로파일을 보수적으로 사용한다.
  const miao = [0, 4, 8];
  const li = [1, 5, 9];
  const weak = [2, 6, 10];

  if (starType === "bad") {
    if (miao.includes(branch)) return normalizeStarStrength("묘", "◎");
    if (li.includes(branch)) return normalizeStarStrength("득", "O");
    if (weak.includes(branch)) return normalizeStarStrength("함", "X");
    return normalizeStarStrength("평", "△");
  }

  if (miao.includes(branch)) return normalizeStarStrength("묘", "◎");
  if (li.includes(branch)) return normalizeStarStrength("득", "O");
  if (weak.includes(branch)) return normalizeStarStrength("평", "△");
  return normalizeStarStrength("리", "▲");
}

const PALACE_LABEL_TO_ID: Record<string, ZiweiPalaceId> = {
  "명궁": "ming",
  "형제궁": "siblings",
  "부부궁": "spouse",
  "부처궁": "spouse",
  "배우자궁": "spouse",
  "자녀궁": "children",
  "재백궁": "wealth",
  "질액궁": "health",
  "천이궁": "travel",
  "노복궁": "friends",
  "교우궁": "friends",
  "관록궁": "career",
  "전택궁": "property",
  "복덕궁": "fortune",
  "부모궁": "parents",
};

const PALACE_ID_ORDER: ZiweiPalaceId[] = [
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

const LUCKY_STAR_SET = new Set(["문창", "문곡", "좌보", "우필", "녹존", "천괴", "천월", "천마"]);

const STAR_KEYWORD_MAP: Record<string, string[]> = {
  자미: ["중심", "리더십", "책임"],
  천기: ["전략", "분석", "설계"],
  태양: ["표현", "추진", "영향력"],
  무곡: ["실무", "재정", "관리"],
  천동: ["회복", "공감", "완충"],
  염정: ["원칙", "개혁", "집중"],
  천부: ["안정", "축적", "보존"],
  태음: ["감수성", "디테일", "직관"],
  탐랑: ["확장", "매력", "기회"],
  거문: ["언어", "설득", "논리"],
  천상: ["조율", "균형", "협력"],
  천량: ["보호", "멘토", "윤리"],
  칠살: ["결단", "돌파", "집중"],
  파군: ["전환", "혁신", "개척"],
};

function toStarMeta(
  stars: ZiweiStar[],
  starType: ZiweiStarMeta["starType"],
  transformMap: Map<string, "화록" | "화권" | "화과" | "화기">,
): ZiweiStarMeta[] {
  return stars.map((s) => {
    const normalized = normalizeStarStrength(s.strength, s.symbol);
    return {
      name: s.name,
      symbol: normalized.symbol,
      strength: normalized.strength,
      strengthSymbol: normalized.symbol,
      starType,
      transformation: transformMap.get(s.name) || null,
    };
  });
}

function findSihuaInPalace(stars: ZiweiStarMeta[], sihua: ZiweiChartData["sihua"]): string[] {
  const sourceNames = new Set(stars.map((s) => s.name));
  const tags: string[] = [];
  if (sihua.luk && sourceNames.has(sihua.luk)) tags.push("화록");
  if (sihua.quan && sourceNames.has(sihua.quan)) tags.push("화권");
  if (sihua.ke && sourceNames.has(sihua.ke)) tags.push("화과");
  if (sihua.ji && sourceNames.has(sihua.ji)) tags.push("화기");
  return tags;
}

function buildPalaceKeywords(mainStars: ZiweiStarMeta[], sihua: string[]): string[] {
  const set = new Set<string>();
  mainStars.forEach((star) => {
    (STAR_KEYWORD_MAP[star.name] || ["균형", "관리"]).forEach((k) => set.add(k));
  });
  sihua.forEach((k) => set.add(k));
  if (!set.size) {
    set.add("균형");
    set.add("관리");
    set.add("실행");
  }
  return Array.from(set).slice(0, 6);
}

function palaceScore(main: ZiweiStarMeta[], aux: ZiweiStarMeta[], bad: ZiweiStarMeta[], sihua: string[]): number {
  let score = 50;
  score += main.length * 8;
  score += aux.length * 3;
  score -= bad.length * 4;
  if (sihua.includes("화록")) score += 4;
  if (sihua.includes("화권")) score += 3;
  if (sihua.includes("화과")) score += 3;
  if (sihua.includes("화기")) score -= 5;
  return Math.max(10, Math.min(95, score));
}

function starSymbol(star: ZiweiStarMeta): string {
  return String(star.strengthSymbol || star.symbol || "").trim();
}

function dedupeStars(stars: ZiweiStarMeta[]): ZiweiStarMeta[] {
  const seen = new Set<string>();
  const result: ZiweiStarMeta[] = [];
  stars.forEach((star) => {
    const key = `${star.name}:${star.starType || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(star);
  });
  return result;
}

function buildStrengthSummary(stars: ZiweiStarMeta[]) {
  const strongestStars = stars.filter((star) => {
    const symbol = starSymbol(star);
    return symbol === "◎" || symbol === "O";
  });
  const weakStars = stars.filter((star) => {
    const symbol = starSymbol(star);
    return symbol === "△" || symbol === "X";
  });
  return {
    strongestStars,
    weakStars,
    hasMiaoWang: strongestStars.length > 0,
    hasXianRuo: weakStars.some((star) => starSymbol(star) === "X"),
  };
}

function uniqueTransformations(items: Array<FourTransformation | null | undefined>): FourTransformation[] {
  const seen = new Set<string>();
  const list: FourTransformation[] = [];
  items.forEach((item) => {
    if (!item) return;
    const key = `${item.type}:${item.starName}:${item.palaceName}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push(item);
  });
  return list;
}

function buildPalaces(chart: ZiweiChartData): ZiweiPalace[] {
  const transformMap = new Map<string, "화록" | "화권" | "화과" | "화기">();
  if (chart.sihua.luk) transformMap.set(chart.sihua.luk, "화록");
  if (chart.sihua.quan) transformMap.set(chart.sihua.quan, "화권");
  if (chart.sihua.ke) transformMap.set(chart.sihua.ke, "화과");
  if (chart.sihua.ji) transformMap.set(chart.sihua.ji, "화기");

  const converted = chart.palaceStarData
    .map((palaceData) => {
      const id = PALACE_LABEL_TO_ID[palaceData.palace];
      if (!id) return null;

      const mainStars = toStarMeta(palaceData.stars, "main", transformMap);
      const auxiliaryStars = toStarMeta(palaceData.auxStars, "assistant", transformMap);
      const maleficStars = toStarMeta(palaceData.badStars, "malefic", transformMap);
      const luckyStars = auxiliaryStars.filter((s) => LUCKY_STAR_SET.has(s.name));
      const subStars = [...auxiliaryStars];
      const minorStars = [...luckyStars, ...maleficStars];
      const allStars = dedupeStars([...mainStars, ...subStars, ...minorStars]);
      const sihua = findSihuaInPalace([...mainStars, ...auxiliaryStars], chart.sihua);
      const keywords = buildPalaceKeywords(mainStars, sihua);
      const normalizedName = normalizePalaceName(id === "friends" ? "교우궁" : palaceData.palace);
      const branch = String(palaceData.branch || "");

      return {
        index: 0,
        id,
        name: normalizedName,
        normalizedName,
        branch,
        earthlyBranch: branch,
        mainStars,
        subStars,
        minorStars,
        allStars,
        auxiliaryStars,
        maleficStars,
        luckyStars,
        isEmptyMainStarPalace: mainStars.length === 0,
        strengthSummary: buildStrengthSummary(allStars),
        fourTransformations: [],
        incomingFourTransformations: [],
        sihua,
        oppositePalace: null,
        sanFangSiZheng: {
          self: normalizedName,
          wealthOrCareerRelated: "",
          relationshipRelated: "",
          opposite: "",
          palaceNames: [],
          mainStars: [],
          fourTransformations: [],
        },
        oppositePalaceId: "ming",
        triadPalaceIds: ["ming", "career", "wealth"],
        keywords,
        score: palaceScore(mainStars, auxiliaryStars, maleficStars, sihua),
        isEmpty: mainStars.length === 0,
        dahan: palaceData.dahan,
      } as ZiweiPalace;
    })
    .filter(Boolean) as ZiweiPalace[];

  const ordered = PALACE_ID_ORDER.map((id) => converted.find((p) => p.id === id)).filter(Boolean) as ZiweiPalace[];

  ordered.forEach((palace, idx) => {
    palace.index = idx;
    const opposite = getOppositePalaceIndex(idx);
    palace.oppositePalaceId = PALACE_ID_ORDER[opposite];
    palace.triadPalaceIds = [PALACE_ID_ORDER[(idx + 4) % 12], PALACE_ID_ORDER[(idx + 8) % 12]];
  });

  const fourTransformations = calculateFourTransformations({
    yearStem: chart.yearGan,
    palaces: ordered,
  });

  ordered.forEach((palace) => {
    const selfTransforms = fourTransformations.byPalace[palace.normalizedName] || [];
    palace.fourTransformations = [...selfTransforms];
    palace.sihua = selfTransforms.map((item) => transformationTypeToLabel(item.type));

    const sfIndexes = getSanFangSiZhengIndexes(palace.index);
    const oppositePalace = ordered[getOppositePalaceIndex(palace.index)] || null;
    const triadA = ordered[(palace.index + 4) % 12];
    const triadB = ordered[(palace.index + 8) % 12];
    const linkedPalaces = sfIndexes.map((idx) => ordered[idx]).filter(Boolean);
    const linkedMainStars = dedupeStars(linkedPalaces.flatMap((item) => item.mainStars));
    const linkedTransforms = uniqueTransformations(
      linkedPalaces.flatMap((item) => fourTransformations.byPalace[item.normalizedName] || []),
    );
    const directKeys = new Set(palace.fourTransformations.map((item) => `${item.type}:${item.starName}`));

    palace.incomingFourTransformations = linkedTransforms.filter(
      (item) => !directKeys.has(`${item.type}:${item.starName}`),
    );

    palace.sanFangSiZheng = {
      self: palace.name,
      wealthOrCareerRelated: triadA?.name || "",
      relationshipRelated: triadB?.name || "",
      opposite: oppositePalace?.name || "",
      palaceNames: linkedPalaces.map((item) => item.name),
      mainStars: linkedMainStars,
      fourTransformations: linkedTransforms,
    };

    palace.oppositePalace = oppositePalace
      ? {
          name: oppositePalace.name,
          index: oppositePalace.index,
          mainStars: oppositePalace.mainStars,
          fourTransformations: [...(fourTransformations.byPalace[oppositePalace.normalizedName] || [])],
        }
      : null;

    palace.isEmptyMainStarPalace = palace.mainStars.length === 0;
    palace.isEmpty = palace.isEmptyMainStarPalace;
    palace.strengthSummary = buildStrengthSummary(palace.allStars);
    palace.keywords = buildPalaceKeywords(
      palace.mainStars,
      palace.fourTransformations.map((item) => transformationTypeToLabel(item.type)),
    );
    palace.score = palaceScore(palace.mainStars, palace.auxiliaryStars, palace.maleficStars, palace.sihua);
  });

  return ordered;
}

const PALACE_ID_TO_CANONICAL_KEY: Record<ZiweiPalaceId, ZiweiCanonicalPalace["key"]> = {
  ming: "life",
  siblings: "siblings",
  spouse: "spouse",
  children: "children",
  wealth: "wealth",
  health: "health",
  travel: "travel",
  friends: "friends",
  career: "career",
  property: "property",
  fortune: "fortune",
  parents: "parents",
};

const PALACE_MEANING: Record<ZiweiPalaceId, string> = {
  ming: "타고난 정체성과 핵심 의사결정 패턴",
  siblings: "형제·동료·가까운 협력 구조",
  spouse: "연애·결혼·파트너십 운영 방식",
  children: "자녀·후배·프로젝트 결실 에너지",
  wealth: "수익 구조와 재물 운영 방식",
  health: "컨디션·회복·에너지 관리 방향",
  travel: "외부 활동·사회 인터페이스·확장성",
  friends: "네트워크·협업·귀인/소인 패턴",
  career: "직업 구조·역할·비즈니스 로직",
  property: "공간·기반·자산 축적 방식",
  fortune: "내면 행복·정신 에너지·회복력",
  parents: "부모·권위자·후원 인연 구조",
};

function toCanonicalStar(meta: ZiweiStarMeta, type: ZiweiCanonicalStar["type"]): ZiweiCanonicalStar {
  const normalized = normalizeStarStrength(meta.strength, meta.strengthSymbol || meta.symbol);
  return {
    name: meta.name,
    type,
    strength: normalized.strength,
    strengthSymbol: normalized.symbol,
    transformation: meta.transformation || null,
    description: "",
  };
}

function buildCanonicalInput(chart: ZiweiDeepChart): ZiweiDeepAnalysisInput {
  const palaces: ZiweiCanonicalPalace[] = chart.palaces.map((p) => {
    const transformations = [...p.mainStars, ...p.auxiliaryStars, ...p.maleficStars]
      .filter((s) => Boolean(s.transformation))
      .map((s) => toCanonicalStar(s, "transform"));
    return {
      key: PALACE_ID_TO_CANONICAL_KEY[p.id],
      name: p.name,
      meaning: PALACE_MEANING[p.id],
      mainStars: p.mainStars.map((s) => toCanonicalStar(s, "main")),
      assistantStars: p.auxiliaryStars.map((s) => toCanonicalStar(s, "assistant")),
      maleficStars: p.maleficStars.map((s) => toCanonicalStar(s, "malefic")),
      transformations,
      oppositePalace: p.oppositePalaceId,
      triadPalaces: p.triadPalaceIds,
    };
  });

  const lifePalace = palaces.find((p) => p.key === "life") || palaces[0];
  const bodySource = chart.palaces.find((p) => p.earthlyBranch === chart.shenGong);
  const bodyPalace = bodySource
    ? palaces.find((p) => PALACE_ID_TO_CANONICAL_KEY[bodySource.id] === p.key)
    : undefined;
  const allStars = palaces.flatMap((p) => [...p.mainStars, ...p.assistantStars, ...p.maleficStars]);
  const byTransform = (type: ZiweiCanonicalStar["transformation"]) => allStars.find((s) => s.transformation === type);

  return {
    palaces,
    lifePalace,
    bodyPalace,
    fourTransformations: {
      hualu: byTransform("화록"),
      huaquan: byTransform("화권"),
      huake: byTransform("화과"),
      huaji: byTransform("화기"),
    },
    majorLuck: chart.majorPeriods,
    yearlyLuck: chart.annualFlow,
  };
}

export function calculateZiweiChart(input: ZiweiUserInput): ZiweiDeepChart {
  const base = calcZiweiPalaces(
    input.birthYear,
    input.birthMonth,
    input.birthDay,
    input.birthHour,
    input.birthMinute,
    input.gender,
  );

  const palaces = buildPalaces(base);
  const fourTransformations = calculateFourTransformations({
    yearStem: base.yearGan,
    palaces,
  });

  const withoutSummary = {
    version: ZIWEI_ENGINE_VERSION,
    user: input,
    warnings: [],
    debugWarnings: [],
    mingGong: base.meng,
    shenGong: base.body,
    birthYearStem: normalizeYearStem(base.yearGan),
    yearGan: base.yearGan,
    yearZhi: base.yearZhi,
    juInfo: base.juInfo,
    sihua: {
      hualu: base.sihua.luk,
      huaquan: base.sihua.quan,
      huake: base.sihua.ke,
      huaji: base.sihua.ji,
    },
    palaces,
    fourTransformations,
    majorPeriods: palaces.map((p) => ({ palaceId: p.id, range: p.dahan })),
    annualFlow: {
      yearLabel: `${base.yearGan}${base.yearZhi}`,
      keyPalaces: palaces
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((p) => p.id),
      notes: [
        "유년/유월 정밀 예측은 제공 범위 내에서 보수적으로 해석합니다.",
        "핵심 궁의 흐름을 기준으로 월별 실행 강도를 조절해 보세요.",
      ],
    },
  };

  const chartWithSummary: ZiweiDeepChart = {
    ...withoutSummary,
    summary: generateZiweiDeepSummary(withoutSummary),
  };

  chartWithSummary.canonicalInput = buildCanonicalInput(chartWithSummary);
  return chartWithSummary;
}

export function validateAdvancedZiweiResult(result: ZiweiDeepChart): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!result) {
    return { valid: false, missingFields: ["result"] };
  }
  if (!result.mingGong) missingFields.push("mingGong");
  if (!result.birthYearStem) missingFields.push("birthYearStem");
  if (!result.fourTransformations) missingFields.push("fourTransformations");
  if (!Array.isArray(result.palaces) || result.palaces.length !== 12) {
    missingFields.push("palaces");
  }

  (result.palaces || []).forEach((palace, index) => {
    if (!palace?.name) missingFields.push(`palaces[${index}].name`);
    if (!palace?.branch) missingFields.push(`palaces[${index}].branch`);
    if (!Array.isArray(palace?.mainStars)) missingFields.push(`palaces[${index}].mainStars`);
    if (Array.isArray(palace?.mainStars) && !palace.mainStars.length && !palace?.isEmptyMainStarPalace) {
      console.warn(`[Ziwei] Unexpected empty mainStars at ${palace?.name || index}`);
    }
    if (
      Array.isArray(palace?.mainStars)
      && Array.isArray(palace?.auxiliaryStars)
      && Array.isArray(palace?.maleficStars)
      && !palace.mainStars.length
      && !palace.auxiliaryStars.length
      && !palace.maleficStars.length
    ) {
      console.warn(`[Ziwei] Palace has no star data at all: ${palace?.name || index}`);
    }
    if (!Array.isArray(palace?.fourTransformations)) missingFields.push(`palaces[${index}].fourTransformations`);
    if (!palace?.sanFangSiZheng) missingFields.push(`palaces[${index}].sanFangSiZheng`);
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function normalizeZiweiForAdvancedReport(baseResult: ZiweiDeepChart): ZiweiDeepChart {
  const source = baseResult;
  const yearStem = normalizeYearStem(source.birthYearStem || source.yearGan);
  const nextPalaces = Array.isArray(source.palaces) ? source.palaces.map((palace, idx) => {
    const branch = String((palace as ZiweiPalace).branch || (palace as ZiweiPalace).earthlyBranch || "");
    const normalizedName = normalizePalaceName((palace as ZiweiPalace).name);
    const mainStars = Array.isArray((palace as ZiweiPalace).mainStars) ? (palace as ZiweiPalace).mainStars : [];
    const auxiliaryStars = Array.isArray((palace as ZiweiPalace).auxiliaryStars) ? (palace as ZiweiPalace).auxiliaryStars : [];
    const maleficStars = Array.isArray((palace as ZiweiPalace).maleficStars) ? (palace as ZiweiPalace).maleficStars : [];
    const luckyStars = Array.isArray((palace as ZiweiPalace).luckyStars) ? (palace as ZiweiPalace).luckyStars : [];
    const subStars = Array.isArray((palace as ZiweiPalace).subStars) ? (palace as ZiweiPalace).subStars : [...auxiliaryStars];
    const minorStars = Array.isArray((palace as ZiweiPalace).minorStars) ? (palace as ZiweiPalace).minorStars : [...luckyStars, ...maleficStars];
    const allStars = Array.isArray((palace as ZiweiPalace).allStars)
      ? (palace as ZiweiPalace).allStars
      : dedupeStars([...mainStars, ...subStars, ...minorStars]);

    return {
      ...(palace as ZiweiPalace),
      index: Number.isFinite((palace as ZiweiPalace).index) ? (palace as ZiweiPalace).index : idx,
      name: normalizedName || (palace as ZiweiPalace).name,
      normalizedName: normalizedName || (palace as ZiweiPalace).name,
      branch,
      earthlyBranch: branch,
      mainStars,
      auxiliaryStars,
      maleficStars,
      luckyStars,
      subStars,
      minorStars,
      allStars,
      isEmptyMainStarPalace: mainStars.length === 0,
      strengthSummary: buildStrengthSummary(allStars),
      fourTransformations: Array.isArray((palace as ZiweiPalace).fourTransformations) ? (palace as ZiweiPalace).fourTransformations : [],
      incomingFourTransformations: Array.isArray((palace as ZiweiPalace).incomingFourTransformations) ? (palace as ZiweiPalace).incomingFourTransformations : [],
      sihua: Array.isArray((palace as ZiweiPalace).sihua) ? (palace as ZiweiPalace).sihua : [],
      oppositePalace: (palace as ZiweiPalace).oppositePalace || null,
      sanFangSiZheng: (palace as ZiweiPalace).sanFangSiZheng || {
        self: normalizedName,
        wealthOrCareerRelated: "",
        relationshipRelated: "",
        opposite: "",
        palaceNames: [],
        mainStars: [],
        fourTransformations: [],
      },
    } as ZiweiPalace;
  }) : [];

  const normalizedFour = calculateFourTransformations({
    yearStem,
    palaces: nextPalaces,
  });

  const normalizedChart = {
    ...source,
    version: ZIWEI_ENGINE_VERSION,
    birthYearStem: yearStem,
    palaces: nextPalaces,
    fourTransformations: normalizedFour,
  } as ZiweiDeepChart;

  const validation = validateAdvancedZiweiResult(normalizedChart);
  if (!validation.valid) {
    normalizedChart.debugWarnings = [
      ...(normalizedChart.debugWarnings || []),
      `명반 데이터 보정 중 오류: ${validation.missingFields.join(", ")}`,
    ];
  }

  const starlessPalaces = normalizedChart.palaces.filter((palace) => {
    const mainLen = Array.isArray(palace.mainStars) ? palace.mainStars.length : 0;
    const auxLen = Array.isArray(palace.auxiliaryStars) ? palace.auxiliaryStars.length : 0;
    const maleficLen = Array.isArray(palace.maleficStars) ? palace.maleficStars.length : 0;
    return mainLen + auxLen + maleficLen === 0;
  });

  if (starlessPalaces.length) {
    const names = starlessPalaces.map((palace) => palace.name).join(", ");
    console.warn(`[Ziwei] Star extraction anomaly: empty star arrays in ${names}`);
    normalizedChart.debugWarnings = [
      ...(normalizedChart.debugWarnings || []),
      `일부 궁에서 별 데이터가 비어 있어 재계산이 필요할 수 있습니다: ${names}`,
    ];
  }

  if ((normalizedChart.palaces || []).length !== 12) {
    console.warn(`[Ziwei] Palace count mismatch. expected=12 actual=${(normalizedChart.palaces || []).length}`);
    normalizedChart.debugWarnings = [
      ...(normalizedChart.debugWarnings || []),
      `궁 개수 불일치(12궁 기준): ${(normalizedChart.palaces || []).length}`,
    ];
  }

  return normalizedChart;
}
