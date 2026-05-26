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
  부부궁: "spouse",
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
  "○": "득",
  O: "득",
  "▲": "리",
  "△": "평",
  "함": "함",
  "×": "함",
  X: "함",
});

const SYMBOL_BY_STRENGTH = Object.freeze({
  묘: "◎",
  왕: "◎",
  득: "O",
  리: "▲",
  평: "△",
  함: "X",
  실: "X",
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
  1: ["1. 명반 기본 정보", "2. 명반의 핵심 축", "3. 전체 별자리 배치 요약", "4. 인생 전체 기조"],
  2: ["1. 명궁 주성 분석", "2. 명궁 보조성 분석", "3. 명궁의 묘왕득리평함실 강도", "4. 명궁 삼방사정 분석", "5. 명궁 종합 진단"],
  3: ["1. 신궁 위치 해석", "2. 신궁 별자리 분석", "3. 명궁과 신궁의 관계", "4. 신궁 기반 실전 전략"],
  4: ["1. 형제궁", "2. 부부궁", "3. 자녀궁", "4. 재백궁", "5. 질액궁", "6. 천이궁", "7. 노복궁", "8. 관록궁", "9. 전택궁", "10. 복덕궁", "11. 부모궁", "12. 명궁 재정리"],
  5: ["1. 화록 분석", "2. 화권 분석", "3. 화과 분석", "4. 화기 분석", "5. 사화 종합 구조"],
  6: ["1. 재백궁 심층 분석", "2. 관록궁 심층 분석", "3. 명궁·재백궁·관록궁 연결", "4. 사업운과 독립운", "5. 재물운 실전 전략"],
  7: ["1. 부부궁 심층 분석", "2. 배우자운 분석", "3. 연애의 반복 패턴", "4. 결혼운과 장기 관계", "5. 인연운 실전 조언"],
  8: ["1. 노복궁 분석", "2. 형제궁 분석", "3. 천이궁 분석", "4. 귀인운 분석", "5. 인간관계 전략"],
  9: ["1. 질액궁 분석", "2. 복덕궁 분석", "3. 심리 패턴 분석", "4. 생활 리듬과 에너지", "5. 복덕운 실전 조언"],
  10: ["1. 대운 기본 구조", "2. 초년운", "3. 청년운", "4. 중년운", "5. 장년·후반운", "6. 대운별 핵심 전략"],
  11: ["1. 올해의 기본 운세", "2. 올해의 재물운", "3. 올해의 직업운", "4. 올해의 연애·관계운", "5. 올해의 건강·심리운", "6. 월별 흐름(1~12월)"],
  12: ["1. 가장 강한 운명의 무기", "2. 가장 조심해야 할 약점", "3. 인생의 핵심 성공 공식", "4. 운을 여는 실전 전략", "5. 최종 결론"],
  13: ["1. 연간 핵심 기조", "2. 월별 기회 구간", "3. 월별 주의 구간", "4. 실전 행동 캘린더", "5. 연간 결론"],
  14: ["1. 장기 목표 축", "2. 전환점 분석", "3. 누적 패턴", "4. 반복 리스크", "5. 장기 실행 원칙"],
  15: ["1. 핵심 결론", "2. 우선순위 재정렬", "3. 즉시 실행 항목", "4. 금지 항목", "5. 최종 마스터 가이드"],
});

const ZIWEI_CHAPTER_TARGET_CHARS = Object.freeze([
  9200,
  9000,
  9200,
  9000,
  9300,
  9300,
  9200,
  9000,
  9000,
  9000,
  9000,
  9400,
  8800,
  8800,
  9000,
]);

const ZIWEI_CHAPTER_SPECS = Object.freeze(
  ZIWEI_PDF_CHAPTERS.map((chapter, index) => ({
    id: chapter.key || `ch_${index + 1}`,
    chapterNo: index + 1,
    title: chapter.title,
    goal: chapter.goal,
    purpose: chapter.goal,
    targetChars: Number(chapter.targetChars || ZIWEI_CHAPTER_TARGET_CHARS[index] || 9000),
    minChars: Math.max(8500, Math.floor(Number(chapter.targetChars || ZIWEI_CHAPTER_TARGET_CHARS[index] || 9000) * 0.9)),
    sections: ZIWEI_CHAPTER_CATEGORY_GUIDE[index + 1] || ["핵심 구조", "현실 적용", "주의점", "실천 전략"],
    requiredDataKeys: asArray(chapter.requiredDataKeys),
    focus: chapter.key,
  })),
);

const ZIWEI_CHAPTER_MIN_LENGTH = 8500;
const ZIWEI_CHAPTER_MAX_LENGTH = 12500;

const ZIWEI_PDF_FORBIDDEN_PHRASES = Object.freeze([
  "생성 상태 안내",
  "서버 응답이 불안정",
  "구조화된 스켈레톤",
  "스켈레톤",
  "기본 골격",
  "다음 생성 시",
  "자동 재작성",
  "자동 복구",
  "복구 생성",
  "fallback",
  "placeholder",
  "Chapter 1",
  "Chapter 2",
  "원인:",
  "기본 자미두수 분석을 먼저 실행",
  "이 섹션은 챕터 구조 보존을 위한 기본 골격입니다",
]);

const ZIWEI_CHAPTER_MASTER_ADVICE = Object.freeze({
  1: "총론 챕터는 개별 해석보다 전체 구조의 일관성을 잡는 단계다. 명반의 핵심 축을 먼저 정의하고 이후 장의 해석 기준선을 고정하라.",
  2: "명궁은 선천적 성향의 중심축이다. 주성·보조성·강약·삼방사정을 하나의 캐릭터 모델로 통합해 실행 규칙으로 전환하라.",
  3: "신궁은 후천적으로 드러나는 실전 자아다. 명궁과 신궁의 차이를 행동 습관으로 변환해 성장 동선으로 설계하라.",
  4: "12궁 해석은 분절이 아니라 연결이 핵심이다. 각 궁의 기능을 분리하되 최종적으로 명궁 축으로 재정렬해 의사결정 지도를 완성하라.",
  5: "사화는 사건의 촉발 기제다. 화록·화권·화과·화기의 방향을 구분해 기회와 리스크의 트리거를 미리 식별하라.",
  6: "재물·직업운은 분리되지 않는다. 재백궁·관록궁·명궁의 연결을 기준으로 수익 구조와 성취 루틴을 함께 설계하라.",
  7: "연애·결혼운은 반복 패턴을 읽는 싸움이다. 부부궁을 중심으로 관계 트리거를 정의하고 장기 관계 운영 문장을 고정하라.",
  8: "사회운은 사람의 질과 구조의 문제다. 노복궁·형제궁·천이궁을 통해 귀인과 소모 관계를 구분하고 협업 원칙을 명확히 하라.",
  9: "건강·심리운은 회복 리듬 관리가 핵심이다. 질액궁·복덕궁 신호를 조기에 포착해 에너지 손실을 줄이는 루틴으로 연결하라.",
  10: "대운 해석은 시기별 전략 배분이다. 각 연령대 구간을 확장/방어 관점으로 나누어 장기 실행 우선순위를 잡아라.",
  11: "세운·유년운은 단기 전술의 영역이다. 올해 핵심 흐름과 월별 변화를 결합해 현실적 Go/Hold/Retreat 기준을 수립하라.",
  12: "최종 종합 챕터는 결론이 아니라 실행 안내서다. 무기·약점·성공 공식을 하나의 실전 프레임으로 고정해 반복 가능하게 만들라.",
  13: "연간 운세 로드맵은 시기별 배분 전략이다. 월별 기회·주의 구간을 분리해 실행 캘린더로 고정하라.",
  14: "생애 마스터플랜은 시간축 통합 설계다. 전환점과 누적 패턴을 같은 프레임에서 관리해 장기 리스크를 줄여라.",
  15: "최종 전략 제언은 의사결정 운영 매뉴얼이다. 즉시 실행 항목과 금지 항목을 분리해 재현 가능한 습관으로 전환하라.",
});

const ZIWEI_CHAPTER_CONTRACTS = Object.freeze({
  1: {
    targetPalace: "명반 총론",
    relatedPalaces: ["명궁", "신궁", "관록궁", "재백궁"],
    mustCover: [
      "명반 기본 정보", "명반 핵심 축", "전체 별자리 배치", "인생 전체 기조",
    ],
  },
  2: {
    targetPalace: "명궁",
    relatedPalaces: ["관록궁", "재백궁", "신궁", "복덕궁"],
    mustCover: [
      "명궁 주성", "명궁 보조성", "강약", "삼방사정", "명궁 종합 진단",
    ],
  },
  3: {
    targetPalace: "신궁",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁"],
    mustCover: [
      "신궁 위치", "신궁 별자리", "명궁-신궁 관계", "신궁 기반 실전 전략",
    ],
  },
  4: {
    targetPalace: "12궁",
    relatedPalaces: ["명궁", "부부궁", "관록궁", "재백궁", "복덕궁", "부모궁"],
    mustCover: [
      "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁", "명궁 재정리",
    ],
  },
  5: {
    targetPalace: "사화",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁"],
    mustCover: [
      "화록", "화권", "화과", "화기", "사화 종합 구조",
    ],
  },
  6: {
    targetPalace: "재백궁",
    relatedPalaces: ["관록궁", "복덕궁", "명궁"],
    mustCover: [
      "재백궁 심층", "관록궁 심층", "명궁-재백궁-관록궁 연결", "사업운", "재물운 전략",
    ],
  },
  7: {
    targetPalace: "부부궁",
    relatedPalaces: ["명궁", "복덕궁"],
    mustCover: [
      "부부궁 심층", "배우자운", "연애 반복 패턴", "결혼·장기 관계", "인연운 조언",
    ],
  },
  8: {
    targetPalace: "노복궁",
    relatedPalaces: ["형제궁", "천이궁", "명궁", "관록궁"],
    mustCover: [
      "노복궁", "형제궁", "천이궁", "귀인운", "인간관계 전략",
    ],
  },
  9: {
    targetPalace: "질액궁",
    relatedPalaces: ["복덕궁", "명궁"],
    mustCover: [
      "질액궁", "복덕궁", "심리 패턴", "생활 리듬", "복덕운 조언",
    ],
  },
  10: {
    targetPalace: "대운",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁", "복덕궁"],
    mustCover: [
      "대운 구조", "초년운", "청년운", "중년운", "장년·후반운", "대운 핵심 전략",
    ],
  },
  11: {
    targetPalace: "세운",
    relatedPalaces: ["재백궁", "관록궁", "부부궁", "질액궁", "복덕궁"],
    mustCover: [
      "올해 기본 운세", "올해 재물운", "올해 직업운", "올해 연애·관계운", "올해 건강·심리운", "월별 흐름",
    ],
  },
  12: {
    targetPalace: "최종 종합",
    relatedPalaces: ["명궁", "신궁", "관록궁", "재백궁", "부부궁", "복덕궁"],
    mustCover: [
      "강한 운명의 무기", "조심해야 할 약점", "핵심 성공 공식", "운을 여는 실전 전략", "최종 결론",
    ],
  },
  13: {
    targetPalace: "연간 운세",
    relatedPalaces: ["명궁", "재백궁", "관록궁", "부부궁", "질액궁", "복덕궁"],
    mustCover: [
      "연간 핵심 기조", "월별 기회 구간", "월별 주의 구간", "실전 행동 캘린더", "연간 결론",
    ],
  },
  14: {
    targetPalace: "생애 마스터플랜",
    relatedPalaces: ["명궁", "신궁", "관록궁", "재백궁", "복덕궁", "전택궁"],
    mustCover: [
      "장기 목표 축", "전환점 분석", "누적 패턴", "반복 리스크", "장기 실행 원칙",
    ],
  },
  15: {
    targetPalace: "최종 전략",
    relatedPalaces: ["명궁", "신궁", "관록궁", "재백궁", "부부궁", "복덕궁", "질액궁"],
    mustCover: [
      "핵심 결론", "우선순위 재정렬", "즉시 실행 항목", "금지 항목", "최종 마스터 가이드",
    ],
  },
});

function buildZiweiChapterMasterAdvice(chapterSpec, chapterData = {}) {
  const chapterNo = Number(chapterSpec?.chapterNo || chapterSpec?.num || 0);
  const corePalaces = asArray(chapterData?.corePalaces).map((token) => asText(token)).filter(Boolean);
  const coreStars = asArray(chapterData?.coreStars).map((token) => asText(token)).filter(Boolean);
  const primaryPalaceKey = corePalaces[0] || "";
  const primaryPalaceName = primaryPalaceKey
    ? (ZIWEI_PALACE_MEANINGS[primaryPalaceKey]?.name || primaryPalaceKey)
    : (ZIWEI_CHAPTER_CONTRACTS[chapterNo]?.targetPalace || "핵심 궁위");
  const starLabel = coreStars.length ? coreStars.slice(0, 2).join("·") : "핵심 주성";
  const base = ZIWEI_CHAPTER_MASTER_ADVICE[chapterNo] || "현재 챕터의 핵심 데이터에 맞춰 실행 가능한 전략을 하나씩 고정해 나가면 운의 체감이 분명해진다.";
  return `${base} 이번 장의 실행 기준은 ${primaryPalaceName}과 ${starLabel}의 작동을 주간 루틴으로 고정하는 것이다.`;
}

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
  if (token === "○" || token === "O" || token === "◉") return "O";
  if (token === "▲") return "▲";
  if (token === "O") return "O";
  if (token === "△") return "△";
  if (token === "함" || token === "X" || token === "×") return "X";
  return null;
}

function normalizeStrengthName(raw) {
  const token = asText(raw);
  if (!token) return null;
  if (["묘", "廟", "묘왕", "묘왕지"].includes(token)) return "묘";
  if (["왕", "旺"].includes(token)) return "왕";
  if (["득", "得", "득지"].includes(token)) return "득";
  if (["리", "利", "리지", "약"].includes(token)) return "리";
  if (["평", "平", "평지"].includes(token)) return "평";
  if (["함", "陷", "함지", "극함", "심한함", "불", "불리"].includes(token)) return "함";
  if (["실"].includes(token)) return "실";
  return null;
}

export function mapZiweiStrengthSymbol(brightness) {
  const token = normalizeStrengthName(brightness);
  if (token === "묘" || token === "왕") return "◎";
  if (token === "득") return "O";
  if (token === "리") return "▲";
  if (token === "평") return "△";
  if (token === "함" || token === "실") return "X";
  return "△";
}

export function getZiweiStrengthSymbol(brightness) {
  return mapZiweiStrengthSymbol(brightness);
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
  const symbol = getZiweiStrengthSymbol(name) || SYMBOL_BY_STRENGTH[name] || null;
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
  const strengthSymbol = normalizeStrengthSymbol(source.symbol || source.strengthSymbol) || picked.symbol || getZiweiStrengthSymbol(strengthName) || "△";

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
  const byName = new Map();
  const rows = [];
  asArray(stars).forEach((star) => {
    const normalized = normalizeRawStarForPdf(star);
    const name = asText(normalized?.nameKo || normalized?.name);
    if (!name) return;
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, normalized);
      rows.push(normalized);
      return;
    }
    if (!existing.symbol && normalized.symbol) existing.symbol = normalized.symbol;
    if (!existing.strength && normalized.strength) existing.strength = normalized.strength;
    if (!existing.brightness && normalized.brightness) existing.brightness = normalized.brightness;
    if (!existing.brightnessKo && normalized.brightnessKo) existing.brightnessKo = normalized.brightnessKo;
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
  const palaces = asArray(normalized?.palaces);
  const transformationRows = palaces
    .flatMap((palace) => asArray(palace?.sihua).map((item) => ({
      starName: asText(item?.star),
      palaceName: asText(palace?.name),
      type: asText(item?.type),
    })))
    .filter((row) => row.starName && row.type);
  const findTransformation = (type) => transformationRows.find((row) => row.type === type) || null;

  const ziweiBookContext = {
    profile: {
      name: asText(normalized?.userProfile?.name) || undefined,
      gender: asText(normalized?.userProfile?.gender) || undefined,
      birthDate: asText(normalized?.userProfile?.birthDate),
      birthTime: asText(normalized?.userProfile?.birthTime) || undefined,
      calendarType: asText(userProfile?.calendarType) || "solar",
      leapMonth: Boolean(userProfile?.leapMonth),
    },
    chart: {
      lifePalace: asText(normalized?.chartMeta?.命宮) || undefined,
      bodyPalace: asText(normalized?.chartMeta?.身宮) || undefined,
      lifeMaster: asText(rawChart?.chartMeta?.lifeMaster || rawChart?.lifeMaster) || undefined,
      bodyMaster: asText(rawChart?.chartMeta?.bodyMaster || rawChart?.bodyMaster) || undefined,
      palaces: palaces.map((palace) => ({
        name: asText(palace?.name),
        branch: asText(palace?.branch) || undefined,
        stem: asText(palace?.stem) || undefined,
        mainStars: asArray(palace?.mainStars).map((star) => ({
          name: asText(star?.name),
          brightness: asText(star?.strengthName) || undefined,
          strengthSymbol: asText(star?.strengthSymbol) || undefined,
          keywords: [],
        })),
        auxiliaryStars: asArray(palace?.assistantStars).map((star) => ({
          name: asText(star?.name),
          brightness: asText(star?.strengthName) || undefined,
          strengthSymbol: asText(star?.strengthSymbol) || undefined,
          keywords: [],
        })),
        minorStars: asArray(palace?.minorStars).map((star) => ({
          name: asText(star?.name),
          brightness: asText(star?.strengthName) || undefined,
          strengthSymbol: asText(star?.strengthSymbol) || undefined,
          keywords: [],
        })),
        transformations: asArray(palace?.sihua).map((item) => asText(item?.type)).filter(Boolean),
        oppositePalace: asText(palace?.oppositePalaceKey) || undefined,
        triadPalaces: asArray(palace?.trianglePalaceKeys).map((item) => asText(item)).filter(Boolean),
        summary: asText(palace?.description) || undefined,
      })),
      transformations: {
        huaLu: findTransformation("화록") ? { starName: findTransformation("화록")?.starName, palaceName: findTransformation("화록")?.palaceName } : undefined,
        huaQuan: findTransformation("화권") ? { starName: findTransformation("화권")?.starName, palaceName: findTransformation("화권")?.palaceName } : undefined,
        huaKe: findTransformation("화과") ? { starName: findTransformation("화과")?.starName, palaceName: findTransformation("화과")?.palaceName } : undefined,
        huaJi: findTransformation("화기") ? { starName: findTransformation("화기")?.starName, palaceName: findTransformation("화기")?.palaceName } : undefined,
      },
      threeSidesFourOpposites: toPlainObject(normalized?.relationships),
      majorPeriods: asArray(normalized?.cycles?.daXian),
      annualFortune: toPlainObject(normalized?.cycles?.annual),
      monthlyFortune: asArray(normalized?.cycles?.monthly),
    },
    promptContext: {
      generatedQuestionPrompt: asText(rawChart?.generatedQuestionPrompt || rawChart?.promptContext?.generatedQuestionPrompt) || undefined,
      engineSummary: asText(rawChart?.engineSummary || rawChart?.promptContext?.engineSummary) || undefined,
      userQuestion: asText(rawChart?.userQuestion || rawChart?.promptContext?.userQuestion) || undefined,
    },
    meta: {
      missingFields: asArray(validation?.missingFields).map((field) => asText(field)).filter(Boolean),
      availableFields: ["profile", "chart", "promptContext"],
      generatedAt: new Date().toISOString(),
    },
  };

  return {
    ...normalized,
    validation,
    ziweiBookContext,
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

function normalizeHeadingToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ch\.?\s*\d+/g, "")
    .replace(/[\s\-_/|:()\[\]{}.,]/g, "");
}

function normalizeZiweiSectionsByChapterSpec(sections, chapterSpec, chapterSummary, chapterSubtitle) {
  const sourceSections = asArray(sections)
    .map((row) => ({
      heading: sanitizeZiweiOutputText(asText(row?.heading)) || "핵심 해석",
      body: sanitizeZiweiOutputText(asText(row?.body)),
    }))
    .filter((row) => row.body);

  const expectedHeadings = asArray(chapterSpec?.sections)
    .map((heading) => sanitizeZiweiOutputText(asText(heading)))
    .filter(Boolean);

  if (!expectedHeadings.length) {
    return sourceSections.length > 0
      ? sourceSections
      : [{ heading: "핵심 해석", body: sanitizeZiweiOutputText(asText(chapterSummary || chapterSubtitle || "핵심 해석 내용")) }];
  }

  const normalized = [];
  const usedIndices = new Set();

  expectedHeadings.forEach((expectedHeading) => {
    const expectedToken = normalizeHeadingToken(expectedHeading);
    let pickedIndex = -1;

    for (let i = 0; i < sourceSections.length; i += 1) {
      if (usedIndices.has(i)) continue;
      const row = sourceSections[i];
      const token = normalizeHeadingToken(row.heading);
      if (token === expectedToken || token.includes(expectedToken) || expectedToken.includes(token)) {
        pickedIndex = i;
        break;
      }
    }

    if (pickedIndex === -1) {
      for (let i = 0; i < sourceSections.length; i += 1) {
        if (!usedIndices.has(i)) {
          pickedIndex = i;
          break;
        }
      }
    }

    let body = "";
    if (pickedIndex >= 0) {
      usedIndices.add(pickedIndex);
      body = sanitizeZiweiOutputText(asText(sourceSections[pickedIndex]?.body));
    }

    if (!body) {
      body = sanitizeZiweiOutputText([
        `${expectedHeading} 영역은 현재 챕터의 핵심 근거를 바탕으로 우선 해석합니다.`,
        asText(chapterSummary || chapterSubtitle || "핵심 구조를 중심으로 해석을 이어갑니다."),
      ].filter(Boolean).join("\n\n"));
    }

    normalized.push({
      heading: expectedHeading,
      body,
    });
  });

  return normalized;
}

function resolveZiweiChapterTargetPalace(chapterSpec) {
  const chapterNo = Number(chapterSpec?.chapterNo || chapterSpec?.num || 0);
  const contract = chapterNo > 0 ? ZIWEI_CHAPTER_CONTRACTS[chapterNo] : null;
  const raw = asText(contract?.targetPalace);
  if (!raw) return "";
  return raw.replace(/\(.*?\)/g, "").trim();
}

function shouldEnforceZiweiTargetPalace(targetPalaceName) {
  return Boolean(targetPalaceName) && /궁/.test(String(targetPalaceName));
}

function ensureZiweiTargetPalaceSentence(text, targetPalaceName, starsText) {
  const source = sanitizeZiweiOutputText(asText(text));
  if (!shouldEnforceZiweiTargetPalace(targetPalaceName)) return source;
  if (source.includes(targetPalaceName)) return source;
  const prefix = `${targetPalaceName}에서는 ${targetPalaceName}의 구조와 별 배치(${starsText || "데이터에 맞는 별"})를 중심으로 해석합니다.`;
  return sanitizeZiweiOutputText([prefix, source].filter(Boolean).join("\n\n"));
}

function formatScopedStarLabel(star) {
  const name = asText(star?.name);
  const symbol = asText(star?.strengthSymbol);
  const strength = asText(star?.strengthName);
  if (!name) return "";
  if (symbol && strength && strength !== "미상") return `${name}(${symbol} ${strength})`;
  if (symbol) return `${name}(${symbol})`;
  return name;
}

function buildChapterScopedPromptData(chapterContract, context) {
  const targetPalaceName = asText(chapterContract?.targetPalace).replace(/\(.*?\)/g, "").trim();
  const relatedPalaceNames = asArray(chapterContract?.relatedPalaces)
    .map((row) => asText(row).replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);
  const palaces = asArray(context?.palaces);

  const currentPalace = palaces.find((row) => asText(row?.name) === targetPalaceName) || null;
  const currentStars = []
    .concat(asArray(currentPalace?.mainStars))
    .concat(asArray(currentPalace?.assistantStars))
    .concat(asArray(currentPalace?.minorStars))
    .map((star) => formatScopedStarLabel(star))
    .filter(Boolean);

  const scopedPalaces = [];
  if (currentPalace) {
    scopedPalaces.push({
      name: asText(currentPalace?.name),
      branch: asText(currentPalace?.branch),
      descriptionFocus: asText(currentPalace?.description) || `${asText(currentPalace?.name)} 핵심 구조`,
      stars: currentStars,
    });
  }

  relatedPalaceNames.forEach((name) => {
    const row = palaces.find((p) => asText(p?.name) === name);
    if (!row) return;
    const stars = []
      .concat(asArray(row?.mainStars))
      .concat(asArray(row?.assistantStars))
      .concat(asArray(row?.minorStars))
      .map((star) => formatScopedStarLabel(star))
      .filter(Boolean)
      .slice(0, 8);
    scopedPalaces.push({
      name: asText(row?.name),
      branch: asText(row?.branch),
      descriptionFocus: asText(row?.description) || `${asText(row?.name)} 보조 근거`,
      stars,
    });
  });

  return {
    targetPalaceName,
    relatedPalaceNames,
    currentStars,
    scopedPalaces,
  };
}

export function buildZiweiGeminiPrompt({ chapter, context, previousChapterSummaries = [] }) {
  const chapterSpec = chapter || ZIWEI_CHAPTER_SPECS[0];
  const chapterTargetChars = Math.max(2500, Number(chapterSpec?.targetChars || 4000));
  const chapterMinChars = Math.max(2000, Number(chapterSpec?.minChars || Math.floor(chapterTargetChars * 0.85)));
  const chapterNo = Number(chapterSpec?.chapterNo || chapterSpec?.num || 0);
  const runtimeChapterContract = context?.chapterContract && typeof context.chapterContract === "object"
    ? context.chapterContract
    : null;
  const chapterContract = runtimeChapterContract || ZIWEI_CHAPTER_CONTRACTS[chapterNo] || null;
  const requiredHeadings = asArray(chapterContract?.requiredHeadings).map(asText).filter(Boolean);
  const requiredJsonFields = asArray(chapterContract?.requiredJsonFields).map(asText).filter(Boolean);
  const chapterSectionHeadings = asArray(chapterSpec?.sections).map(asText).filter(Boolean);
  const chapterSections = chapterSectionHeadings.join(", ");
  const effectiveRequiredHeadings = requiredHeadings.length ? requiredHeadings : chapterSectionHeadings;
  const premiumContext = toPlainObject(context?.premiumContext);
  const hasPremiumContext = Object.keys(premiumContext).length > 0;
  const scopedPromptData = buildChapterScopedPromptData(chapterContract, context);
  const currentPalaceText = scopedPromptData.targetPalaceName || asText(chapterContract?.targetPalace) || "현재 챕터 대상 궁";
  const currentStarsText = scopedPromptData.currentStars.length ? scopedPromptData.currentStars.join(", ") : "데이터에 맞는 별 주입";
  const requiredCategoryHeadings = [
    "핵심 요약",
    "자미두수 구조 해석",
    "강점과 기회",
    "주의할 패턴",
    "현실 적용 전략",
  ];

  const systemPrompt = [
    "# Role & Purpose",
    "You are the core interpretation engine for the premium astrology platform \"Code: Destiny\".",
    "너의 임무는 검증된 로컬 계산 엔진 JSON 데이터만 사용하여 자미두수 프리미엄 리포트를 생성하는 것이다.",
    "",
    "# CRITICAL GENERATION RULES (STRICTLY ENFORCED)",
    "1) NO CROSS-CONTAMINATION (궁/별 매핑 절대 독립 유지)",
    `- 현재 챕터 대상 궁은 ${currentPalaceText}이다. 이 챕터 본문은 반드시 ${currentPalaceText}의 구조와 별만 중심으로 해석한다.`,
    "- 다른 챕터 궁/별의 해석 문장, 관점, 결론을 재사용하지 않는다.",
    "- 현재 챕터 데이터에 없는 별 이름을 임의로 추가하거나 암시하지 않는다.",
    "2) ZERO TOLERANCE FOR SENTENCE LOOPING / REPETITION",
    "- 동일 문장, 동일 결론, 동일 연결문을 반복하지 않는다.",
    "- 각 문장은 이전 문장 대비 새로운 정보 또는 실행 포인트를 제공해야 한다.",
    "- 너는 입력된 [궁]과 [별] 데이터에 대해서만 분석해야 해. 이전에 생성한 텍스트나 의미 없는 문장을 절대 반복하지 말고, 위의 필수 카테고리 목차에 맞춰 구체적이고 논리적으로 서술해.",
    "3) PREMIUM & HIGH-END TONE",
    "- 한국어 존댓말(~합니다/~하세요) 기반의 깊이 있고 전문적인 문체를 유지한다.",
    "",
    "# ENGINE DATA POLICY",
    "- 계산은 하지 않는다. 제공된 엔진 데이터와 knowledgeBase만 사용한다.",
    "- 별 강약(묘/왕/득/리/평/함) 정보가 있으면 반드시 해석에 반영한다.",
    "- 데이터 부족 안내, 시스템 규칙 문장, 메모성 문구를 본문에 쓰지 않는다.",
    "",
    "# OUTPUT CONTRACT",
    "- 반드시 JSON만 출력한다.",
    "- 확장 스키마와 legacy 스키마를 동시에 포함한 단일 JSON 객체를 출력한다.",
    "- chapterTitle/title은 입력 챕터 제목과 정확히 일치시킨다.",
    "- summary/intro에는 현재 궁 이름과 현재 궁 별 목록을 명시한다.",
    effectiveRequiredHeadings.length
      ? `- sections heading은 다음 순서/문구를 정확히 사용한다: ${effectiveRequiredHeadings.join(", ")}`
      : "- sections heading은 챕터 스키마를 정확히 따른다.",
    `- 챕터 총 분량은 공백 포함 ${chapterTargetChars}자 내외, 최소 ${chapterMinChars}자 이상으로 작성한다.`,
    requiredJsonFields.length ? `- chapterContract.requiredJsonFields를 응답 JSON에 모두 포함한다: ${requiredJsonFields.join(", ")}.` : "- 출력 JSON의 필수 키를 누락하지 않는다.",
    hasPremiumContext
      ? "- [기본/심화 통합 보조 데이터]가 있으면 최소 5개 이상의 구체 근거(궁/별/강약/대운/연월운/요약)를 본문에 반영한다."
      : "- 제공된 데이터 근거를 문장마다 명시적으로 반영한다.",
    "- [필수 출력 카테고리 목차]의 5개 항목은 반드시 본문에서 모두 다뤄야 한다.",
    "- subChapters의 각 analysisText는 최소 3문단으로 작성하고 strategicGuidance는 재현 가능한 실행 문장으로 작성한다.",
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
    hasPremiumContext
      ? ""
      : null,
    hasPremiumContext
      ? "[기본/심화 통합 보조 데이터]"
      : null,
    hasPremiumContext
      ? JSON.stringify(premiumContext, null, 2)
      : null,
    "",
    "[자미두수 기본 해석 Knowledge Base]",
    JSON.stringify(context.knowledgeBase || {}, null, 2),
    "",
    duplicateAvoidanceText,
    "[작성할 챕터]",
    chapterSpec.title,
    chapterContract ? `[대상 궁위] ${chapterContract.targetPalace}` : "",
    chapterContract ? `[관련 궁위] ${chapterContract.relatedPalaces.join(", ")}` : "",
    `[현재 챕터 궁/별 스코프 데이터]\n${JSON.stringify({
      palaceName: currentPalaceText,
      stars: scopedPromptData.currentStars,
      scopedPalaces: scopedPromptData.scopedPalaces,
    }, null, 2)}`,
    `[현재 챕터 intro 템플릿]\n{{USER_NAME}}님의 ${currentPalaceText}에서는 ${currentPalaceText}의 구조를 중심으로 분석합니다. 이 챕터의 핵심은 ${currentPalaceText}에 배치된 별들이 만드는 패턴과 역할입니다. 별 배치는 ${currentStarsText}로 확인되며, 이들이 함께 작동하는 방식을 이해하는 것이 현실 적용의 첫걸음입니다.`,
    chapterContract ? `[필수 커버리지]\n- ${chapterContract.mustCover.join("\n- ")}` : "",
    effectiveRequiredHeadings.length ? `[chapter 카테고리 고정 헤딩]\n- ${effectiveRequiredHeadings.join("\n- ")}` : "",
    `[필수 출력 카테고리 목차]\n- ${requiredCategoryHeadings.join("\n- ")}`,
    requiredJsonFields.length ? `[chapterContract.requiredJsonFields]\n- ${requiredJsonFields.join("\n- ")}` : "",
    "",
    "[챕터 작성 목표 및 세부 카테고리 가이드]",
    chapterSpec.goal,
    chapterSections ? `챕터 카테고리: ${chapterSections}` : "",
    "반드시 각 영역별 특징과 운의 활용도, 대안 행동 계획까지 연결하여 서술하세요.",
    "",
    "[출력 형식]",
    "반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 출력하지 마세요.",
    effectiveRequiredHeadings.length
      ? `sections는 반드시 ${effectiveRequiredHeadings.length}개이며, heading은 위 [chapter 카테고리 고정 헤딩]과 완전히 동일하고 순서도 같아야 합니다.`
      : "",
    "{",
    '  "chapterId": "string",',
    '  "chapterTitle": "string",',
    '  "metaData": {',
    '    "targetPalaces": ["string"],',
    '    "analyzedStars": ["string"],',
    '    "calculatedTransformations": ["string"]',
    "  },",
    '  "subChapters": [',
    '    {',
    '      "subId": "string",',
    '      "subTitle": "string",',
    '      "analysisText": "string",',
    '      "strategicGuidance": "string"',
    "    }",
    "  ],",
    '  "engineSummaryJson": {',
    '    "coreVibe": "string",',
    '    "actionPriority": {',
    '      "immediate": "string",',
    '      "stop": "string",',
    '      "review": "string"',
    "    }",
    "  },",
    '  "chapterNo": "number",',
    '  "title": "string",',
    '  "intro": "string",',
    '  "sections": [',
    '    { "heading": "string", "body": "string" }',
    "  ],",
    '  "coreAdvice": "string",',
    '  "actionGuide": ["string", "string", "string"],',
    '  "closing": "string"',
    "}",
    "",
    "[문체 및 분량 상세 기준]",
    "- 30년 경력 상담가가 직접 읽어주는 1:1 컨설팅 톤으로 쓰세요.",
    "- 별 강약 기호가 있으면 반드시 해석에 반영하세요.",
    "- 본 챕터는 현재 대상 궁/별에만 집중하고 타 궁/타 별 서사를 섞지 마세요.",
    "- 문장 반복/결론 반복/문단 복제를 금지합니다.",
    `- 챕터 총 분량은 공백 포함 ${chapterTargetChars}자 내외, 최소 ${chapterMinChars}자 이상을 지키고 sections 내 각 body 항목은 1200자 이상으로 작성하세요.`,
    "- 데이터가 없는 경우에는 기본 궁 의미와 knowledgeBase를 활용해 자연스럽게 상담 흐름으로 보강하세요.",
    "- 데이터 부족 안내나 메모성 문구는 출력하지 마세요.",
    "- coreAdvice는 반드시 현재 챕터의 대상 궁위와 관련 궁위를 직접 언급한 실행 조언으로 작성하세요.",
    hasPremiumContext
      ? "- [기본/심화 통합 보조 데이터]가 있으면 최소 5개 이상의 구체 근거(궁/별/강약/대운/연월운/요약)를 본문에 반영하세요."
      : null,
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
  const subChapters = asArray(chapter.subChapters)
    .map((row) => toPlainObject(row))
    .filter((row) => asText(row.subTitle || row.title || row.heading) && asText(row.analysisText || row.body));
  if (sections.length < 2 && subChapters.length < 2) return false;
  const summary = asText(chapter.summary || chapter.intro);
  const title = asText(chapter.chapterTitle || chapter.title);
  const advice = asText(chapter.masterAdvice || chapter.masterConclusion || chapter.coreAdvice)
    || asText(chapter?.engineSummaryJson?.coreVibe);
  if (!summary || !title || !advice) return false;
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

export function sanitizeZiweiChapterJson(rawChapter, chapterSpec) {
  const chapter = toPlainObject(rawChapter);
  const targetPalaceName = resolveZiweiChapterTargetPalace(chapterSpec);
  const chapterNo = Number(chapterSpec?.chapterNo || chapterSpec?.num || 0);
  const chapterId = asText(chapter.chapterId || chapter.id || chapterSpec?.id || chapterSpec?.key || `ch_${chapterNo || 1}`);

  const expandedSubChapters = asArray(chapter.subChapters)
    .map((row, idx) => {
      const item = toPlainObject(row);
      const heading = sanitizeZiweiOutputText(asText(item.subTitle || item.title || item.heading))
        || sanitizeZiweiOutputText(asText(chapterSpec?.sections?.[idx]))
        || `섹션 ${idx + 1}`;
      const analysis = sanitizeZiweiOutputText(asText(item.analysisText || item.body));
      const guidance = sanitizeZiweiOutputText(asText(item.strategicGuidance || item.guidance));
      const body = [analysis, guidance ? `실행 가이드: ${guidance}` : ""].filter(Boolean).join("\n\n");
      return {
        subId: asText(item.subId || `sub_${chapterNo || 1}_${idx + 1}`),
        subTitle: heading,
        analysisText: analysis,
        strategicGuidance: guidance,
        body,
      };
    })
    .filter((row) => row.analysisText || row.body);

  const rawSubtitle = sanitizeZiweiOutputText(asText(chapter.chapterSubtitle));
  const rawCoreStars = asArray(chapter.coreStars).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const coreStars = rawCoreStars.length > 0 ? rawCoreStars : ["자미"];
  const starsText = coreStars.join(", ");
  const expandedSummary = asText(chapter?.engineSummaryJson?.coreVibe);
  const rawSummary = ensureZiweiTargetPalaceSentence(
    sanitizeZiweiOutputText(asText(chapter.summary || chapter.intro || expandedSummary)),
    targetPalaceName,
    starsText,
  );
  let sections = normalizeZiweiSectionsByChapterSpec(
    expandedSubChapters.length > 0
      ? expandedSubChapters.map((row) => ({ heading: row.subTitle, body: row.body }))
      : asArray(chapter.sections),
    chapterSpec,
    rawSummary,
    rawSubtitle,
  );

  if (shouldEnforceZiweiTargetPalace(targetPalaceName)) {
    sections = sections.map((section) => ({
      heading: section.heading,
      body: ensureZiweiTargetPalaceSentence(section.body, targetPalaceName, starsText),
    }));
  }

  const expandedActionPriority = toPlainObject(chapter?.engineSummaryJson?.actionPriority);
  const practicalAdvice = asArray(chapter.practicalAdvice || chapter.actionGuide)
    .map((item) => sanitizeZiweiOutputText(asText(item)))
    .filter(Boolean)
    .concat([
      asText(expandedActionPriority.immediate),
      asText(expandedActionPriority.stop),
      asText(expandedActionPriority.review),
    ].map((row) => sanitizeZiweiOutputText(row)).filter(Boolean));
  const cautions = asArray(chapter.cautions).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);

  const corePalaces = asArray(chapter.corePalaces).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const normalizedMasterAdvice = ensureZiweiTargetPalaceSentence(
    sanitizeZiweiOutputText(asText(chapter.masterAdvice || chapter.masterConclusion || chapter.coreAdvice)),
    targetPalaceName,
    starsText,
  );
  const chapterSpecificMasterAdvice = buildZiweiChapterMasterAdvice(chapterSpec, {
    corePalaces: corePalaces.length > 0 ? corePalaces : (targetPalaceName ? [targetPalaceName] : []),
    coreStars,
  });
  const normalizedClosing = ensureZiweiTargetPalaceSentence(
    sanitizeZiweiOutputText(asText(chapter.closing)),
    targetPalaceName,
    starsText,
  );
  const masterConclusion = normalizedMasterAdvice
    || normalizedClosing
    || sanitizeZiweiOutputText(asText(chapter?.engineSummaryJson?.coreVibe))
    || chapterSpecificMasterAdvice;

  const normalizedCorePalaces = (() => {
    const base = corePalaces.length > 0 ? corePalaces.slice() : [];
    if (!targetPalaceName) return base.length > 0 ? base : ["ming"];
    const targetPalaceKey = PALACE_KEY_MAP[targetPalaceName] || targetPalaceName;
    if (!base.includes(targetPalaceKey) && !base.includes(targetPalaceName)) base.unshift(targetPalaceKey);
    return base;
  })();

  const normalizedSubChapters = sections.map((section, idx) => ({
    subId: asText(expandedSubChapters[idx]?.subId || `sub_${chapterNo || 1}_${idx + 1}`),
    subTitle: section.heading,
    analysisText: section.body,
    strategicGuidance: asText(expandedSubChapters[idx]?.strategicGuidance),
  }));

  const normalizedMetaData = {
    targetPalaces: [targetPalaceName || "명궁"],
    analyzedStars: coreStars.slice(0, 6),
    calculatedTransformations: asArray(chapter?.metaData?.calculatedTransformations)
      .map((row) => sanitizeZiweiOutputText(asText(row)))
      .filter(Boolean),
  };

  const engineSummaryJson = {
    coreVibe: sanitizeZiweiOutputText(asText(chapter?.engineSummaryJson?.coreVibe || masterConclusion)),
    actionPriority: {
      immediate: sanitizeZiweiOutputText(asText(expandedActionPriority.immediate || practicalAdvice[0] || "핵심 강점을 외부 실행으로 고정하세요.")),
      stop: sanitizeZiweiOutputText(asText(expandedActionPriority.stop || practicalAdvice[1] || "반복되는 소모 패턴을 멈추세요.")),
      review: sanitizeZiweiOutputText(asText(expandedActionPriority.review || practicalAdvice[2] || "주간 피드백 지표를 점검하세요.")),
    },
  };

  return {
    chapterId,
    chapterTitle: sanitizeZiweiOutputText(asText(chapter.chapterTitle || chapter.title)) || chapterSpec?.title || "자미두수 해석",
    chapterSubtitle: rawSubtitle || "심층 해석",
    title: sanitizeZiweiOutputText(asText(chapter.title || chapter.chapterTitle)) || chapterSpec?.title || "자미두수 해석",
    intro: rawSummary || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    summary: rawSummary || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    sections,
    subChapters: normalizedSubChapters,
    metaData: normalizedMetaData,
    practicalAdvice,
    actionGuide: practicalAdvice.slice(0, 3),
    cautions,
    coreAdvice: masterConclusion,
    masterAdvice: masterConclusion,
    masterConclusion,
    closing: normalizedClosing || masterConclusion,
    chapterNo: chapterNo || Number(chapter.chapterNo || 0) || 1,
    coreStars: coreStars.length > 0 ? coreStars : ["자미"],
    corePalaces: normalizedCorePalaces,
    engineSummaryJson,
    missingDataNotice: null,
  };
}

function buildStrengthTableMarkdown() {
  const rows = ["| 기호 | 명칭 | 의미 |", "|---|---|---|"];
  ["◎", "O", "△", "X"].forEach((symbol) => {
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

  const masterAdviceText = asText(chapter.masterAdvice || chapter.masterConclusion);
  if (masterAdviceText) {
    lines.push("### 최종 실행 정리");
    lines.push(masterAdviceText);
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
  const safeMin = Math.max(1, Number.isFinite(Number(minLength)) ? Math.floor(Number(minLength)) : ZIWEI_CHAPTER_MIN_LENGTH);
  const safeMax = Math.max(safeMin, Number.isFinite(Number(maxLength)) ? Math.floor(Number(maxLength)) : ZIWEI_CHAPTER_MAX_LENGTH);
  output = sanitizeZiweiOutputText(output);
  if (output.length > safeMax) {
    output = trimZiweiMarkdownToMaxLength(output, safeMax);
  }

  // Do not inject synthetic filler text: quality gate should fail short outputs explicitly.
  if (output.length < safeMin) return output;
  return sanitizeZiweiOutputText(output);
}

export function validateZiweiChapterLength(chapterText, targetChars) {
  const safeTarget = Math.max(8500, Number(targetChars || 9000));
  const length = [...String(chapterText || "")].length;
  return {
    length,
    minChars: Math.floor(safeTarget * 0.9),
    ok: length >= safeTarget * 0.9,
  };
}

export function validateZiweiFullReport(fullText) {
  const length = [...String(fullText || "")].length;
  return {
    length,
    ok: length >= 110000 && length <= 160000,
  };
}

const ZIWEI_FORBIDDEN_TEXTS = Object.freeze([
  "이 구조를 정확히 이해하는 것이 나머지 해석의 기초가 됩니다",
  "구조의 본질을 파악하면 변하는 상황에서도 일관된 원칙을 유지할 수 있습니다",
  "이런 강점들을 일상에서 자주 쓸수록 더 강해집니다",
  "패턴을 인식하는 것만으로도 이미 반의 싸움은 이긴 것입니다",
  "작은 행동의 반복이 큰 변화를 만듭니다",
  "별의 배치는 당신의 결정을 가이드하는 도구이며",
  "지금 이 순간에 가장 필요한 행동이 무엇인지 묻고",
  "자동 복구 생성",
  "Chapter 1",
  "데이터가 부족합니다",
  "fallback",
  "API 실패",
  "duplicated section body",
  "거장의 최종 제언",
  "부처궁",
]);

function extractSentences(text) {
  return String(text || "")
    .split(/[\n.!?]+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 35)
    .filter((row) => !/^#{1,6}\s/.test(row))
    .filter((row) => !/^\|/.test(row))
    .filter((row) => !/^[-*]\s/.test(row));
}

function extractParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 90)
    .filter((row) => !/^#{1,6}\s/.test(row))
    .filter((row) => !/^\|/.test(row));
}

function findDuplicates(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.replace(/\s+/g, " ").trim();
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .map(([text, count]) => ({ text, count }));
}

export function validateNoZiweiDuplicateText(reportText) {
  const text = String(reportText || "");
  const sentences = extractSentences(text);
  const paragraphs = extractParagraphs(text);
  const duplicatedSentences = findDuplicates(sentences);
  const duplicatedParagraphs = findDuplicates(paragraphs);
  const forbiddenMatches = ZIWEI_FORBIDDEN_TEXTS.filter((token) => text.includes(token));
  const duplicateSentenceRatio = sentences.length ? duplicatedSentences.length / sentences.length : 0;
  const duplicateParagraphRatio = paragraphs.length ? duplicatedParagraphs.length / paragraphs.length : 0;
  const duplicateSentenceAllowed = duplicatedSentences.length <= 18 || duplicateSentenceRatio <= 0.12;
  const duplicateParagraphAllowed = duplicatedParagraphs.length <= 10 || duplicateParagraphRatio <= 0.08;

  return {
    ok: duplicateSentenceAllowed && duplicateParagraphAllowed && forbiddenMatches.length === 0,
    duplicatedSentences,
    duplicatedParagraphs,
    forbiddenMatches,
    duplicateSentenceRatio,
    duplicateParagraphRatio,
  };
}

export function validateZiweiEngineToPdfMapping(chart = {}, pdf = {}) {
  const failures = [];
  const palaces = asArray(chart?.palaces);
  const pdfPalaces = asArray(pdf?.chart?.palaces || pdf?.palaces);
  const byRole = new Map(palaces.map((p) => [asText(p?.role), p]));
  const pdfByName = new Map(pdfPalaces.map((p) => [asText(p?.name), p]));

  if (palaces.length !== 12) failures.push("12궁 데이터 불일치");
  if (!byRole.get("life")) failures.push("명궁 role(life) 누락");
  if (!byRole.get("career")) failures.push("관록궁 role(career) 누락");
  if (!byRole.get("wealth")) failures.push("재백궁 role(wealth) 누락");
  if (!byRole.get("spouse")) failures.push("부부궁 role(spouse) 누락");
  if (!byRole.get("friends")) failures.push("교우궁 role(friends) 누락");
  if (!byRole.get("property")) failures.push("전택궁 role(property) 누락");
  if (!byRole.get("fortune")) failures.push("복덕궁 role(fortune) 누락");

  palaces.forEach((palace) => {
    const palaceName = asText(palace?.displayName || palace?.name);
    const pdfPalace = pdfByName.get(palaceName);
    const stars = asArray(palace?.allStars);
    if (!pdfPalace) {
      failures.push(`${palaceName} PDF 궁 누락`);
      return;
    }
    const pdfStarNames = new Set(
      asArray(pdfPalace?.mainStars)
        .concat(asArray(pdfPalace?.auxiliaryStars))
        .concat(asArray(pdfPalace?.minorStars))
        .map((s) => asText(s?.name))
        .filter(Boolean),
    );
    stars.forEach((star) => {
      const starName = asText(star?.displayName || star?.name);
      const normalizedStrength = normalizeStrengthName(star?.brightness) || "평";
      const expected = getZiweiStrengthSymbol(normalizedStrength) || "△";
      const actual = normalizeStrengthSymbol(star?.strengthSymbol || "") || expected;
      if (!pdfStarNames.has(starName)) failures.push(`${palaceName}:${starName} 누락`);
      if (actual !== expected) failures.push(`${palaceName}:${starName} 기호 불일치(${actual}!=${expected})`);
    });
  });

  return {
    ok: failures.length === 0,
    failures,
  };
}

const ZIWEI_SKELETON_BINDINGS = Object.freeze({
  1: ["chartMeta", "palaces"],
  2: ["chartMeta.mingGong", "chartMeta.shenGong", "palaces[].mainStars", "relationships"],
  3: ["chartMeta.yearStemBranch", "sihua", "palaces[].transformations"],
  4: ["palaces[].mainStars", "palaces[].assistantStars", "palaces[].minorStars"],
  5: ["palaces[].assistantStars", "palaces[].minorStars", "palaces[].maleficStars"],
  6: ["palaces[].name=wealth", "palaces[].name=career", "relationships"],
  7: ["palaces[].name=spouse", "palaces[].name=children"],
  8: ["palaces[].name=travel", "palaces[].name=property"],
  9: ["palaces[].name=friends", "palaces[].name=siblings"],
  10: ["palaces[].name=fortune", "palaces[].name=parents"],
  11: ["palaces[].name=health", "cycles"],
  12: ["cycles.daXian", "cycles.annual", "cycles.monthly"],
  13: ["cycles.annual", "cycles.monthly", "relationships"],
  14: ["cycles.daXian", "chartMeta", "relationships"],
  15: ["chartMeta", "palaces", "cycles", "relationships"],
});

function getSectionDataBinding(chapterNo, sectionTitle = "") {
  const title = asText(sectionTitle);
  const chapterBindings = asArray(ZIWEI_SKELETON_BINDINGS[Number(chapterNo || 0)]);
  if (!chapterBindings.length) return ["chartMeta", "palaces"];

  if (/명궁|신궁/.test(title)) return Array.from(new Set(chapterBindings.concat(["chartMeta.mingGong", "chartMeta.shenGong"])));
  if (/사화|화록|화권|화과|화기/.test(title)) return Array.from(new Set(chapterBindings.concat(["sihua", "palaces[].transformations"])));
  if (/재백궁|관록궁/.test(title)) return Array.from(new Set(chapterBindings.concat(["palaces[].name=wealth", "palaces[].name=career"])));
  if (/부부궁|배우자|자녀/.test(title)) return Array.from(new Set(chapterBindings.concat(["palaces[].name=spouse", "palaces[].name=children"])));
  if (/천이궁|전택궁/.test(title)) return Array.from(new Set(chapterBindings.concat(["palaces[].name=travel", "palaces[].name=property"])));
  if (/노복궁|형제궁/.test(title)) return Array.from(new Set(chapterBindings.concat(["palaces[].name=friends", "palaces[].name=siblings"])));
  if (/부모궁|질액궁/.test(title)) return Array.from(new Set(chapterBindings.concat(["palaces[].name=parents", "palaces[].name=health"])));
  return chapterBindings;
}

function resolveBoundPalaces(chart = {}, section = {}) {
  const palaces = asArray(chart?.palaces);
  const nameMap = new Map([
    ["명궁", "명궁"],
    ["신궁", "신궁"],
    ["재백궁", "재백궁"],
    ["관록궁", "관록궁"],
    ["부부궁", "부부궁"],
    ["자녀궁", "자녀궁"],
    ["천이궁", "천이궁"],
    ["전택궁", "전택궁"],
    ["노복궁", "노복궁"],
    ["형제궁", "형제궁"],
    ["복덕궁", "복덕궁"],
    ["부모궁", "부모궁"],
    ["질액궁", "질액궁"],
  ]);
  const title = asText(section?.title || section?.heading);
  const keys = [];
  nameMap.forEach((value, key) => {
    if (title.includes(key)) keys.push(value);
  });
  if (!keys.length) {
    const chapterNo = Number(section?.chapterNo || 0);
    if (chapterNo === 2) keys.push("명궁");
    else if (chapterNo === 3) keys.push("명궁", "신궁");
    else if (chapterNo === 6) keys.push("재백궁", "관록궁");
  }
  const selected = palaces.filter((p) => keys.includes(asText(p?.name)) || keys.includes(asText(p?.displayName)));
  return selected.length ? selected : palaces.slice(0, 2);
}

export function buildLocalZiweiSectionDraft(section, chart = {}) {
  const targetSection = toPlainObject(section);
  const boundPalaces = resolveBoundPalaces(chart, targetSection);
  const palaceSummary = boundPalaces.map((palace) => {
    const palaceName = asText(palace?.name || palace?.displayName || "핵심궁");
    const stars = asArray(palace?.mainStars)
      .slice(0, 3)
      .map((star) => {
        const starName = asText(star?.name || star?.nameKo || "");
        const brightness = normalizeStrengthName(star?.strengthName || star?.brightness || star?.strength || "") || "평";
        const symbol = getZiweiStrengthSymbol(brightness);
        return starName ? `${starName}(${symbol}/${brightness})` : "";
      })
      .filter(Boolean)
      .join(", ");
    return `${palaceName} ${stars ? `주요 별: ${stars}` : "주요 별 데이터 기반"}`;
  }).filter(Boolean);

  const contextLine = palaceSummary.length
    ? palaceSummary.join(" | ")
    : "핵심 궁위 중심 해석";
  const sectionTitle = asText(targetSection?.title || targetSection?.heading || "핵심 해석");
  const chapterTitle = asText(targetSection?.chapterTitle || "자미두수 리포트");

  return [
    `${chapterTitle}의 ${sectionTitle}에서는 현재 명반에서 확인 가능한 궁위와 주성의 작동을 우선 기준으로 해석합니다.`,
    `${contextLine} 흐름을 바탕으로 강점은 확장 조건으로, 취약 구간은 방어 규칙으로 분리해 적용해야 합니다.`,
    "해석의 핵심은 단정적 예언이 아니라 선택 기준을 명확히 하는 데 있으며, 실행 항목은 우선순위를 나눠 단계적으로 운영해야 안정적인 결과를 만듭니다.",
  ].join(" ");
}

export function buildZiweiPdfSkeleton(chart, chaptersConfig = ZIWEI_CHAPTER_SPECS) {
  const chapterDefs = asArray(chaptersConfig);
  return chapterDefs.map((chapter, index) => {
    const chapterNo = Number(chapter?.chapterNo || chapter?.num || index + 1);
    const chapterId = asText(chapter?.id || chapter?.key || `chapter-${String(chapterNo).padStart(2, "0")}`);
    const title = asText(chapter?.title || `Chapter ${chapterNo}`);
    const sections = asArray(chapter?.sections).map((sectionTitle, sectionIndex) => {
      const sectionId = `${chapterId}-section-${String(sectionIndex + 1).padStart(2, "0")}`;
      const binding = getSectionDataBinding(chapterNo, sectionTitle);
      const skeletonSection = {
        id: sectionId,
        chapterNo,
        chapterTitle: title,
        title: asText(sectionTitle) || `섹션 ${sectionIndex + 1}`,
        categoryPurpose: `${title}의 ${asText(sectionTitle) || `섹션 ${sectionIndex + 1}`} 해석`,
        dataBinding: binding,
      };
      const localDraft = buildLocalZiweiSectionDraft(skeletonSection, chart || {});
      return {
        ...skeletonSection,
        localDraft,
        finalText: localDraft,
        source: "local",
      };
    });

    return {
      id: chapterId,
      order: chapterNo,
      roman: toRoman(chapterNo),
      title,
      purpose: asText(chapter?.purpose || chapter?.goal || title),
      requiredDataKeys: asArray(chapter?.requiredDataKeys),
      sections,
    };
  });
}

export function assertNoZiweiPdfFallbackText(text, meta = {}) {
  const source = String(text || "");
  const hit = ZIWEI_PDF_FORBIDDEN_PHRASES.find((phrase) => source.includes(phrase));
  if (hit) {
    const err = new Error(`ZIWEI_FORBIDDEN_PHRASE_DETECTED:${hit}`);
    err.code = "ZIWEI_FORBIDDEN_PHRASE_DETECTED";
    err.foundPhrase = hit;
    err.meta = {
      chapterId: asText(meta?.chapterId),
      categoryId: asText(meta?.categoryId),
      requestId: asText(meta?.requestId),
      userId: asText(meta?.userId),
      retryCount: Number(meta?.retryCount || 0),
      hasSourceData: Boolean(meta?.hasSourceData),
    };
    throw err;
  }
  return true;
}

export function buildZiweiPdfChapterManifest(chapterSpecs = ZIWEI_CHAPTER_SPECS) {
  return asArray(chapterSpecs).map((spec, index) => ({
    id: asText(spec?.id) || `ch_${index + 1}`,
    chapterNo: Number(spec?.chapterNo || index + 1),
    title: asText(spec?.title) || `자미두수 챕터 ${index + 1}`,
    categories: asArray(spec?.sections).map((sectionTitle, sectionIndex) => ({
      id: `${asText(spec?.id) || `ch_${index + 1}`}-cat-${String(sectionIndex + 1).padStart(2, "0")}`,
      title: asText(sectionTitle) || `카테고리 ${sectionIndex + 1}`,
    })),
  }));
}

function toChartStarRow(star) {
  const name = asText(star?.name || star?.nameKo);
  const brightness = normalizeStrengthName(star?.strengthName || star?.strength || star?.brightness || star?.brightnessKo) || "평";
  const strengthSymbol = mapZiweiStrengthSymbol(brightness);
  return {
    name,
    brightness,
    strengthSymbol,
  };
}

export function buildZiweiPdfCategorySourceData({ context, chapterId, categoryId, categoryTitle }) {
  const palaces = asArray(context?.palaces);
  const mingPalace = palaces.find((palace) => asText(palace?.key) === "ming") || null;
  const shenPalaceKey = asText(context?.chartMeta?.bodyPalaceKey);
  const shenPalace = palaces.find((palace) => asText(palace?.key) === shenPalaceKey) || null;
  const majorStars = palaces
    .flatMap((palace) => asArray(palace?.mainStars))
    .map(toChartStarRow)
    .filter((row) => row.name);

  const sourceData = {
    chartMeta: toPlainObject(context?.chartMeta),
    mingPalace: mingPalace ? {
      key: asText(mingPalace.key),
      name: asText(mingPalace.name),
      branch: asText(mingPalace.branch),
      mainStars: asArray(mingPalace.mainStars).map(toChartStarRow).filter((row) => row.name),
      sihua: asArray(mingPalace.sihua),
      sanfangSizheng: asArray(context?.relationships?.sanfangsazheng || context?.relationships?.triangle),
    } : null,
    shenPalace: shenPalace ? {
      key: asText(shenPalace.key),
      name: asText(shenPalace.name),
      branch: asText(shenPalace.branch),
      mainStars: asArray(shenPalace.mainStars).map(toChartStarRow).filter((row) => row.name),
      sihua: asArray(shenPalace.sihua),
    } : null,
    palaces: palaces.map((palace) => ({
      key: asText(palace?.key),
      name: asText(palace?.name),
      branch: asText(palace?.branch),
      mainStars: asArray(palace?.mainStars).map(toChartStarRow).filter((row) => row.name),
      assistantStars: asArray(palace?.assistantStars).map(toChartStarRow).filter((row) => row.name),
      minorStars: asArray(palace?.minorStars).map(toChartStarRow).filter((row) => row.name),
      maleficStars: asArray(palace?.maleficStars).map(toChartStarRow).filter((row) => row.name),
      sihua: asArray(palace?.sihua),
    })),
    stars: majorStars,
    luckCycles: toPlainObject(context?.cycles),
    chapterId: asText(chapterId),
    categoryId: asText(categoryId),
    categoryTitle: asText(categoryTitle),
  };

  if (!sourceData.palaces.length) {
    throw new Error(`ZIWEI_CATEGORY_SOURCE_EMPTY:${asText(categoryId) || "unknown"}`);
  }
  if (!sourceData.stars.length) {
    throw new Error(`ZIWEI_CATEGORY_STARS_EMPTY:${asText(categoryId) || "unknown"}`);
  }

  return sourceData;
}

export function buildZiweiPdfPayload({ context, user = {}, reportTitle = "자미두수 인생 총람" }) {
  const chapterManifest = buildZiweiPdfChapterManifest();
  const chapters = chapterManifest.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    categories: chapter.categories.map((category) => ({
      id: category.id,
      title: category.title,
      sourceData: buildZiweiPdfCategorySourceData({
        context,
        chapterId: chapter.id,
        categoryId: category.id,
        categoryTitle: category.title,
      }),
      writingInstruction: `${category.title} 카테고리의 실제 명반 근거만 사용해 상담형 본문을 작성합니다.`,
    })),
  }));

  return {
    reportTitle,
    user: {
      name: asText(user?.name || context?.userProfile?.name) || "사용자",
      gender: asText(user?.gender || context?.userProfile?.gender),
      birthInfo: {
        birthDate: asText(user?.birthDate || context?.userProfile?.birthDate),
        birthTime: asText(user?.birthTime || context?.userProfile?.birthTime),
        lunarDate: asText(user?.lunarDate || context?.userProfile?.lunarDate),
      },
    },
    chart: {
      chartSignature: `${asText(context?.chartMeta?.mingPalaceKey)}:${asText(context?.chartMeta?.bodyPalaceKey)}`,
      palaces: asArray(context?.palaces),
      mingPalace: asText(context?.chartMeta?.mingPalaceKey),
      shenPalace: asText(context?.chartMeta?.bodyPalaceKey),
      stars: toPlainObject(context?.stars),
      sihua: asArray(context?.palaces).flatMap((palace) => asArray(palace?.sihua)),
      sanfangSizheng: toPlainObject(context?.relationships),
      luckCycles: toPlainObject(context?.cycles),
    },
    chapters,
  };
}

export function validateZiweiPdfPayload(payload) {
  const missing = [];
  const p = toPlainObject(payload);
  const chart = toPlainObject(p.chart);
  const chapters = asArray(p.chapters);
  const palaces = asArray(chart.palaces);

  if (!palaces.length || palaces.length < 12) missing.push("chart.palaces");
  if (!asText(chart.mingPalace)) missing.push("chart.mingPalace");
  if (!asText(chart.shenPalace)) missing.push("chart.shenPalace");
  if (!chapters.length) missing.push("chapters");

  chapters.forEach((chapter, cIdx) => {
    const categories = asArray(chapter?.categories);
    if (!categories.length) missing.push(`chapters[${cIdx}].categories`);
    categories.forEach((category, catIdx) => {
      const sourceData = toPlainObject(category?.sourceData);
      if (!Object.keys(sourceData).length) {
        missing.push(`chapters[${cIdx}].categories[${catIdx}].sourceData`);
      }
      const stars = asArray(sourceData?.stars);
      if (!stars.length) missing.push(`chapters[${cIdx}].categories[${catIdx}].sourceData.stars`);
      stars.forEach((star, sIdx) => {
        if (!asText(star?.name)) missing.push(`chapters[${cIdx}].categories[${catIdx}].sourceData.stars[${sIdx}].name`);
        if (!asText(star?.brightness)) missing.push(`chapters[${cIdx}].categories[${catIdx}].sourceData.stars[${sIdx}].brightness`);
        if (!asText(star?.strengthSymbol)) missing.push(`chapters[${cIdx}].categories[${catIdx}].sourceData.stars[${sIdx}].strengthSymbol`);
      });
    });
  });

  return {
    ok: missing.length === 0,
    missing,
  };
}

export function generateZiweiPdfCategoryText({ category, context, previousSummary = "" }) {
  const categoryId = asText(category?.id);
  const categoryTitle = asText(category?.title) || "핵심 해석";
  const sourceData = toPlainObject(category?.sourceData);
  if (!Object.keys(sourceData).length) {
    throw new Error(`ZIWEI_CATEGORY_SOURCE_EMPTY:${categoryId || "unknown"}`);
  }

  const draft = buildLocalZiweiSectionDraft(
    {
      chapterNo: Number(category?.chapterNo || 1),
      chapterTitle: asText(category?.chapterTitle) || "자미두수 심층 해석",
      title: categoryTitle,
    },
    context || {},
  );

  const body = [
    previousSummary ? `이전 요약: ${previousSummary}` : "",
    String(draft || "").trim(),
  ].filter(Boolean).join("\n\n");

  assertNoZiweiPdfFallbackText(body, {
    chapterId: asText(category?.chapterId),
    categoryId,
    hasSourceData: true,
  });

  return {
    chapterId: asText(category?.chapterId),
    categoryId,
    title: categoryTitle,
    body,
    summary: String(body).slice(0, 220),
    actionItems: [
      "핵심 패턴 1개를 오늘 기록합니다.",
      "강점 확장 조건과 위험 방어 조건을 분리합니다.",
      "일주일 뒤 실행 결과를 재평가합니다.",
    ],
  };
}

export function validateZiweiLlmSectionResponse(response, req = {}) {
  const chapterId = asText(req?.chapter?.id);
  const sectionId = asText(req?.section?.id);
  const minChars = Math.max(30, Number(req?.section?.minChars || 30));
  const r = toPlainObject(response);
  const body = asText(r?.body);
  if (!chapterId || !sectionId) return false;
  if (asText(r?.chapterId) !== chapterId) return false;
  if (asText(r?.sectionId) !== sectionId) return false;
  if (body.length < minChars) return false;
  try {
    assertNoZiweiPdfFallbackText(body, { chapterId, categoryId: sectionId, hasSourceData: true });
  } catch (_) {
    return false;
  }
  return true;
}

export function assertZiweiPayloadChaptersMatchConfig(chapters, specs = ZIWEI_CHAPTER_SPECS) {
  const chapterRows = asArray(chapters);
  const specRows = asArray(specs);
  if (chapterRows.length !== specRows.length) {
    throw new Error("ZIWEI_PAYLOAD_CHAPTER_COUNT_MISMATCH");
  }
  chapterRows.forEach((chapter, index) => {
    const spec = specRows[index] || {};
    if (Number(chapter?.order) !== Number(spec?.chapterNo)) {
      throw new Error(`ZIWEI_PAYLOAD_CHAPTER_ORDER_MISMATCH:${index + 1}`);
    }
    if (asText(chapter?.title) !== asText(spec?.title)) {
      throw new Error(`ZIWEI_PAYLOAD_CHAPTER_TITLE_MISMATCH:${index + 1}`);
    }
  });
  return true;
}

export function assertZiweiLlmGenerationComplete(payload) {
  const chapters = asArray(payload?.chapters);
  if (!chapters.length) {
    throw new Error("ZIWEI_LLM_GENERATION_EMPTY");
  }
  chapters.forEach((chapter, cIdx) => {
    const sections = asArray(chapter?.sections);
    if (!sections.length) {
      throw new Error(`ZIWEI_LLM_SECTION_EMPTY:${cIdx + 1}`);
    }
    sections.forEach((section, sIdx) => {
      if (asText(section?.source) !== "llm-enhanced") {
        throw new Error(`ZIWEI_LLM_SECTION_SOURCE_INVALID:${cIdx + 1}:${sIdx + 1}`);
      }
      const text = asText(section?.finalText);
      if (!text) {
        throw new Error(`ZIWEI_LLM_SECTION_TEXT_EMPTY:${cIdx + 1}:${sIdx + 1}`);
      }
      assertNoZiweiPdfFallbackText(text, {
        chapterId: asText(chapter?.id),
        categoryId: asText(section?.id),
        hasSourceData: true,
      });
    });
  });
  return true;
}

export function hasRepetitiveSentences(text) {
  const sentences = String(text || "")
    .split(/[.!?。！？\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const counts = new Map();
  for (const sentence of sentences) {
    const normalized = sentence.replace(/\s+/g, " ");
    const next = (counts.get(normalized) || 0) + 1;
    counts.set(normalized, next);
    if (next >= 3) return true;
  }
  return false;
}

function toRoman(num) {
  const n = Number(num || 0);
  if (!Number.isFinite(n) || n <= 0) return "I";
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [v, token] of map) {
    while (rest >= v) {
      out += token;
      rest -= v;
    }
  }
  return out || "I";
}

export { ZIWEI_PDF_CHAPTERS, ZIWEI_CHAPTER_SPECS, ZIWEI_FORBIDDEN_TEXTS, ZIWEI_PDF_FORBIDDEN_PHRASES };
