import { Solar } from "lunar-javascript";
import { generateZiweiDeepSummary } from "./generate-ziwei-deep-summary";
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

  const PALACE_LABELS = ["명궁", "형제궁", "부처궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
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
  const juLabels: Record<number, string> = { 2: "목3국", 3: "화6국", 4: "금4국", 5: "토5국", 6: "수2국" };

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
    const target = palaceStarData[pIdx % 12];
    const profile = getBrightness(name, pIdx % 12, type);
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
    addStar(luCunPos, "록존", "aux");
    addStar(luCunPos + 1, "경양", "bad");
    addStar(luCunPos + 11, "타라", "bad");
  }
  
  addStar(11 - hIdx, "지공", "bad");
  addStar(11 + hIdx, "지겁", "bad");

  // 사화
  const sihuaMap: Record<string, string[]> = {
    '갑': ['염정', '파군', '무곡', '태양'],
    '을': ['천기', '천량', '자미', '태음'],
    '병': ['천동', '천기', '문창', '염정'],
    '정': ['태음', '천동', '천기', '거문'],
    '무': ['탐랑', '태음', '우필', '천기'],
    '기': ['무곡', '탐랑', '천량', '문곡'],
    '경': ['태양', '무곡', '태음', '천동'],
    '신': ['거문', '태양', '문곡', '문창'],
    '임': ['천량', '자미', '좌보', '무곡'],
    '계': ['파군', '거문', '태음', '탐랑']
  };
  const [luk, quan, ke, ji] = sihuaMap[yGan] || [];

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

/** 묘왕평리함 간략화 로직 */
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
    if (li.includes(branch)) return normalizeStarStrength("왕", "○");
    if (weak.includes(branch)) return normalizeStarStrength("함", "×");
    return normalizeStarStrength("평", "△");
  }

  if (miao.includes(branch)) return normalizeStarStrength("묘", "◎");
  if (li.includes(branch)) return normalizeStarStrength("왕", "○");
  if (weak.includes(branch)) return normalizeStarStrength("평", "△");
  return normalizeStarStrength("리", "△");
}

const PALACE_LABEL_TO_ID: Record<string, ZiweiPalaceId> = {
  "명궁": "ming",
  "형제궁": "siblings",
  "부처궁": "spouse",
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

const LUCKY_STAR_SET = new Set(["문창", "문곡", "좌보", "우필", "록존", "천괴", "천월", "천마"]);

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
      const sihua = findSihuaInPalace([...mainStars, ...auxiliaryStars], chart.sihua);
      const keywords = buildPalaceKeywords(mainStars, sihua);

      return {
        id,
        name: id === "friends" ? "교우궁" : palaceData.palace,
        earthlyBranch: palaceData.branch,
        mainStars,
        auxiliaryStars,
        maleficStars,
        luckyStars,
        sihua,
        oppositePalaceId: "ming",
        triadPalaceIds: ["ming", "career", "wealth"],
        keywords,
        score: palaceScore(mainStars, auxiliaryStars, maleficStars, sihua),
        isEmpty: mainStars.length === 0,
        dahan: palaceData.dahan,
      } as ZiweiPalace;
    })
    .filter(Boolean) as ZiweiPalace[];

  converted.forEach((palace) => {
    const idx = PALACE_ID_ORDER.indexOf(palace.id);
    const opposite = (idx + 6) % 12;
    palace.oppositePalaceId = PALACE_ID_ORDER[opposite];
    palace.triadPalaceIds = [PALACE_ID_ORDER[(idx + 4) % 12], PALACE_ID_ORDER[(idx + 8) % 12]];
  });

  return PALACE_ID_ORDER.map((id) => converted.find((p) => p.id === id)).filter(Boolean) as ZiweiPalace[];
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
  const withoutSummary = {
    user: input,
    warnings: [],
    mingGong: base.meng,
    shenGong: base.body,
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
