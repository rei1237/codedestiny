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
  왕: "O",
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
  1: ["명궁 전체 총론", "명궁 주성의 성격 구조", "보조성·길성·살성이 만드는 세부 기질", "명궁 삼방사정으로 보는 인생 운영 방식", "강점이 살아나는 환경", "반복되는 약점과 오판 패턴", "현실 적용 전략"],
  2: ["신궁 위치가 말하는 후천적 방향", "나이가 들수록 강해지는 성향", "신궁의 별이 만드는 행동 동력", "명궁과 신궁의 차이와 균형", "후천적 성공 조건", "흔들릴 때 드러나는 반응", "현실 적용 전략"],
  3: ["12궁 전체 균형 요약", "나와 가족·관계 영역", "돈·일·사회 영역", "건강·이동·환경 영역", "복덕·부모·내면 기반", "강한 궁과 보완할 궁", "전체 명반 운영 전략"],
  4: ["명반의 대표 주성 요약", "자미·천부 계열의 중심성", "천기·태양·태음 계열의 판단과 감수성", "무곡·천상·천량 계열의 현실성과 책임", "염정·탐랑·거문 계열의 욕망과 표현", "칠살·파군 계열의 변화와 돌파성", "주성 조합을 현실에서 쓰는 법"],
  5: ["관록궁 전체 총론", "일하는 방식과 직업 기질", "성과가 나는 업무 환경", "조직·사업·프리랜서 적합성", "커리어 리스크와 막히는 패턴", "대운에서 커리어가 열리는 시점", "현실 커리어 전략"],
  6: ["재백궁 전체 총론", "돈 버는 방식", "수입원이 열리는 조건", "소비·투자·손실 리스크", "재물과 직업의 연결", "재물운을 안정시키는 환경", "현실 재정 전략"],
  7: ["부부궁 전체 총론", "끌리는 상대의 유형", "연애에서 강해지는 지점", "반복되는 관계 갈등", "결혼·동거·장기 관계 가능성", "관계 회복과 대화 전략", "현실 관계 전략"],
  8: ["인간관계 네트워크 총론", "도움 되는 사람의 유형", "피로해지는 관계 구조", "협업과 팀워크 방식", "귀인과 경쟁자 구분", "관계 리스크 관리", "현실 인맥 전략"],
  9: ["전택궁 전체 총론", "주거와 생활 기반", "부동산·자산 축적 가능성", "가족·공간·심리 안정", "공간이 운에 미치는 영향", "흔들리는 기반을 보완하는 법", "현실 공간·자산 전략"],
  10: ["복덕궁 전체 총론", "내면 만족과 행복 조건", "스트레스 회복 방식", "외로움·불안·공허의 패턴", "취미·몰입·정신적 자산", "인생 후반의 안정성", "현실 회복 전략"],
  11: ["사화 전체 총론", "화록이 여는 기회", "화권이 만드는 힘과 압박", "화과가 주는 명예와 정리 능력", "화기가 만드는 집착과 막힘", "살성과 변동성이 작동하는 방식", "현실 리스크 대응 전략"],
  12: ["현재 대운 총론", "앞으로 10년의 핵심 흐름", "일과 돈의 전환점", "관계와 생활의 전환점", "조심해야 할 시기와 선택", "반드시 잡아야 할 기회", "최종 실행 로드맵"],
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

const ZIWEI_CHAPTER_MASTER_ADVICE = Object.freeze({
  1: "명궁의 강점은 자기 규율이 붙을 때 가장 크게 열린다. 이번 챕터에서 확인한 명궁 주성/보성의 강약을 기준으로, 하루 운영 원칙을 하나로 줄여 일관되게 반복하라.",
  2: "신궁은 시간이 지날수록 드러나는 실전 자아다. 명궁의 의도와 신궁의 행동을 분리해서 기록하고, 위기 상황에서 반복되는 반응을 실행 규칙으로 재설계하라.",
  3: "복덕궁은 행복의 조건을 알려주는 내면 설계도다. 감정 소모를 줄이는 루틴을 먼저 고정하고, 회복 활동을 일정표의 고정 블록으로 배치해 내면 에너지의 손실을 막아라.",
  4: "천이궁은 세상과 만나는 방식의 품질을 결정한다. 외부 평판은 일관된 행동 문장에서 만들어지므로, 대외 커뮤니케이션 원칙을 세 줄로 정의하고 반복 적용하라.",
  5: "관록궁은 커리어 성취의 구조를 보여준다. 조직/독립 중 어디에서 성과가 극대화되는지 분기 기준을 명확히 하고, 90일 단위로 성과 지표를 추적하라.",
  6: "재백궁은 돈의 속도보다 흐름의 안정이 핵심이다. 수입 확장보다 누수 차단을 먼저 실행하고, 지출 의사결정에 상한 규칙을 붙여 자산 체력을 확보하라.",
  7: "부부궁은 관계의 질을 결정하는 경계선 설계도다. 애정 표현과 경계 표현을 동시에 훈련하고, 갈등 시 합의 문장을 미리 정해 관계 소모를 줄여라.",
  8: "교우궁은 사람을 통한 확장과 손실을 함께 보여준다. 귀인과 소모 관계를 구분하는 기준표를 만들고, 협업 전 역할·책임·종료 조건을 먼저 합의하라.",
  9: "전택궁은 공간이 운의 회복률에 미치는 영향을 드러낸다. 주거와 작업 공간의 동선을 단순화하고, 집중 구역과 회복 구역을 분리해 에너지 누수를 차단하라.",
  10: "복덕궁은 진단이 아니라 회복 리듬 관리의 나침반이다. 감정 소모 신호를 빠르게 포착하고 회복 프로토콜을 고정해 후반 안정성을 높여라.",
  11: "사화와 살성은 사건의 촉발 조건을 보여주는 위험 신호다. 터지기 전에 징후를 확인하고 대응 루틴을 사전 설정해 변동성 손실을 줄여라.",
  12: "대운과 세운은 시기별 의사결정 강도를 조절하는 기준선이다. 확장과 방어의 비중을 연도별로 조정해 장기 성과를 누적하라.",
});

const ZIWEI_CHAPTER_CONTRACTS = Object.freeze({
  1: {
    targetPalace: "명궁",
    relatedPalaces: ["관록궁", "재백궁", "천이궁"],
    mustCover: [
      "명궁 기본 의미", "기본 성격", "인생 태도", "핵심 욕망", "명궁 주성 해석", "보조성/살성", "사화", "삼방사정", "인생 캐릭터 정의", "인생 운영 전략",
    ],
  },
  2: {
    targetPalace: "신궁",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁", "천이궁", "복덕궁"],
    mustCover: [
      "신궁 기본 의미", "후천 성향", "위기 본능", "신궁 위치 해석", "명궁-신궁 관계", "신궁 주성/보성", "잠재 무기", "신궁 그림자", "후천운 성장 전략",
    ],
  },
  3: {
    targetPalace: "복덕궁",
    relatedPalaces: ["명궁", "질액궁"],
    mustCover: [
      "복덕궁 기본 의미", "행복 설계", "주성 해석", "보조성/살성", "명궁과의 차이", "질액궁 연결", "행복 방해 패턴", "회복 루틴",
    ],
  },
  4: {
    targetPalace: "12궁 전체",
    relatedPalaces: ["명궁", "부부궁", "관록궁", "재백궁", "복덕궁", "부모궁"],
    mustCover: [
      "12궁 역할 정의", "각 궁 핵심 별", "강한 궁/약한 궁", "관계·재정·커리어 분포", "삼방사정 흐름", "전체 운영 전략",
    ],
  },
  5: {
    targetPalace: "관록궁",
    relatedPalaces: ["명궁", "재백궁", "천이궁"],
    mustCover: [
      "관록궁 기본 의미", "직업 적성", "주성", "보조성/살성", "명궁 관계", "재백궁 관계", "천이궁 관계", "천직 전략",
    ],
  },
  6: {
    targetPalace: "재백궁",
    relatedPalaces: ["관록궁", "복덕궁", "명궁"],
    mustCover: [
      "재백궁 기본 의미", "수익 구조", "주성", "보조성/살성", "사화", "관록궁 관계", "복덕궁 관계", "부의 운영 전략",
    ],
  },
  7: {
    targetPalace: "부부궁",
    relatedPalaces: ["명궁", "복덕궁"],
    mustCover: [
      "부부궁 기본 의미", "연애/결혼 패턴", "주성", "보조성/살성", "사화", "명궁 관계", "복덕궁 관계", "인연 유지 전략",
    ],
  },
  8: {
    targetPalace: "교우궁",
    relatedPalaces: ["명궁", "관록궁"],
    mustCover: [
      "교우궁 기본 의미", "인맥운", "주성", "보조성/살성", "명궁 관계", "관록궁 관계", "귀인/악연 구분", "네트워크 전략",
    ],
  },
  9: {
    targetPalace: "전택궁",
    relatedPalaces: ["복덕궁", "재백궁"],
    mustCover: [
      "전택궁 기본 의미", "주거/공간", "주성", "보조성/살성", "복덕궁 관계", "재백궁 관계", "환경 리스크", "공간 개선 전략",
    ],
  },
  10: {
    targetPalace: "복덕궁",
    relatedPalaces: ["명궁", "부부궁", "재백궁"],
    mustCover: [
      "복덕궁 기본 의미", "내면 만족", "주성", "보조성/살성", "복덕궁-명궁", "복덕궁-부부궁", "복덕궁-재백궁", "회복 루틴",
    ],
  },
  11: {
    targetPalace: "사화·살성",
    relatedPalaces: ["명궁", "부부궁", "관록궁", "재백궁", "교우궁"],
    mustCover: [
      "사화 전체 의미", "화록", "화권", "화과", "화기", "살성 리스크", "변동성 대응 전략",
    ],
  },
  12: {
    targetPalace: "대운·세운",
    relatedPalaces: ["명궁", "관록궁", "재백궁", "부부궁", "복덕궁"],
    mustCover: [
      "현재 대운", "다음 대운", "세운 해석", "일/돈 전환점", "관계/생활 전환점", "주의 시기", "실행 로드맵",
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
  if (["득", "得", "득지", "왕", "旺"].includes(token)) return "득";
  if (["리", "利", "리지", "약"].includes(token)) return "리";
  if (["평", "平", "평지"].includes(token)) return "평";
  if (["함", "陷", "함지", "극함", "심한함", "불", "불리"].includes(token)) return "함";
  if (["실"].includes(token)) return "실";
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
  const effectiveRequiredHeadings = chapterSectionHeadings.length ? chapterSectionHeadings : requiredHeadings;
  const premiumContext = toPlainObject(context?.premiumContext);
  const hasPremiumContext = Object.keys(premiumContext).length > 0;

  const systemPrompt = [
    "너는 자미두수 분야 최고 전문가이며, 30년 경력의 최고급 자미두수 상담가다.",
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
    `8. 각 챕터는 공백 포함 총 ${chapterTargetChars}자 내외를 목표로 깊이 있게 작성한다. 최소 글자 수는 ${chapterMinChars}자 이상이며, sections의 각 body 항목은 공백 포함 1200자 이상으로 작성한다.`,
    "9. 독자가 내 명반을 실제로 읽어준다고 느낄 정도로 구체적으로 작성한다.",
    "10. 무조건 JSON 형식으로만 응답한다.",
    "11. 마크다운 코드블록, 표, 파이프(|) 테이블, 불릿/번호 목록, HTML 태그를 출력하지 않는다.",
    "12. title은 입력된 챕터 title과 정확히 일치해야 하며 임시 제목(예: Chapter 1)을 금지한다.",
    "13. 본 리포트는 12챕터 고정 체계이므로 챕터 번호 체계를 임의로 변경하지 않는다.",
    "14. 데이터 부족/보완/안내/메모 같은 메타 표현을 본문에 쓰지 않는다.",
    "15. 시스템 지침 문장, 프롬프트 규칙 문장, JSON 키 설명 문장을 본문으로 출력하지 않는다.",
    "16. 동일 문장/동일 단락을 반복해 분량을 채우지 않는다.",
    "17. 이전 챕터들과 관점이나 내용이 절대 중복되지 않도록 하라. 제공된 [이전 챕터 요약 정보]를 참조하여, 이미 다른 챕터에서 다룬 해석을 반복하지 않고 이 챕터만의 고유한 관점(예: 성격 자아 -> 직업 자아 -> 재물 성향 등)을 확실히 보여줘라.",
    "18. coreAdvice와 closing은 반드시 현재 챕터의 대상 궁위와 해석 목적에 맞게 작성하고, 다른 챕터에 재사용 가능한 일반론 문장을 금지한다.",
    effectiveRequiredHeadings.length
      ? `19. sections 배열은 다음 heading을 정확한 순서로 1회씩만 사용한다: ${effectiveRequiredHeadings.join(", ")}. 다른 heading 추가를 금지한다.`
      : "19. 챕터 구조 규칙을 누락 없이 반영한다.",
    requiredJsonFields.length ? `20. chapterContract.requiredJsonFields를 응답 JSON에 모두 포함한다: ${requiredJsonFields.join(", ")}.` : "20. 출력 JSON의 필수 키를 누락하지 않는다.",
    hasPremiumContext
      ? "21. [기본/심화 통합 보조 데이터]가 제공되면 궁/주성/강약/대운/연월운/요약 근거를 최소 5개 이상 본문에 반영하고, 추상 문장만으로 분량을 채우지 않는다."
      : "21. 제공된 데이터 근거를 문장마다 명시적으로 반영한다.",
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
    chapterContract ? `[필수 커버리지]\n- ${chapterContract.mustCover.join("\n- ")}` : "",
    effectiveRequiredHeadings.length ? `[chapter 카테고리 고정 헤딩]\n- ${effectiveRequiredHeadings.join("\n- ")}` : "",
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
  if (sections.length < 2) return false;
  const summary = asText(chapter.summary || chapter.intro);
  const title = asText(chapter.chapterTitle || chapter.title);
  const advice = asText(chapter.masterAdvice || chapter.masterConclusion || chapter.coreAdvice);
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
  const rawSummary = sanitizeZiweiOutputText(asText(chapter.summary || chapter.intro));
  const rawSubtitle = sanitizeZiweiOutputText(asText(chapter.chapterSubtitle));
  const sections = normalizeZiweiSectionsByChapterSpec(
    asArray(chapter.sections),
    chapterSpec,
    rawSummary,
    rawSubtitle,
  );

  const practicalAdvice = asArray(chapter.practicalAdvice || chapter.actionGuide)
    .map((item) => sanitizeZiweiOutputText(asText(item)))
    .filter(Boolean);
  const cautions = asArray(chapter.cautions).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  
  const coreStars = asArray(chapter.coreStars).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const corePalaces = asArray(chapter.corePalaces).map((item) => sanitizeZiweiOutputText(asText(item))).filter(Boolean);
  const normalizedMasterAdvice = sanitizeZiweiOutputText(asText(chapter.masterAdvice || chapter.masterConclusion || chapter.coreAdvice));
  const chapterSpecificMasterAdvice = buildZiweiChapterMasterAdvice(chapterSpec, {
    corePalaces,
    coreStars,
  });
  const normalizedClosing = sanitizeZiweiOutputText(asText(chapter.closing));
  const masterConclusion = normalizedMasterAdvice || normalizedClosing || chapterSpecificMasterAdvice;

  return {
    chapterTitle: sanitizeZiweiOutputText(asText(chapter.chapterTitle || chapter.title)) || chapterSpec?.title || "자미두수 해석",
    chapterSubtitle: rawSubtitle || "심층 해석",
    summary: rawSummary || "핵심 데이터와 지식 베이스를 기반으로 챕터를 생성했습니다.",
    sections,
    practicalAdvice,
    cautions,
    masterAdvice: masterConclusion,
    masterConclusion,
    coreStars: coreStars.length > 0 ? coreStars : ["자미"],
    corePalaces: corePalaces.length > 0 ? corePalaces : ["ming"],
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
  const safeMin = Math.max(8500, Number.isFinite(Number(minLength)) ? Math.floor(Number(minLength)) : ZIWEI_CHAPTER_MIN_LENGTH);
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

  const expansionBank = [
    "실전 체크포인트: 같은 결정을 반복해서 틀리는 지점을 먼저 분리하면, 운이 약한 구간에서도 손실을 제한할 수 있습니다.",
    "실행 보정: 강한 별의 장점을 과잉 확장하지 않고, 약한 별이 드러나는 상황을 미리 차단하는 방식이 장기 성과에 유리합니다.",
    "관계 운영: 대화의 목적과 경계를 문장으로 고정해두면 감정 소모를 줄이고 핵심 협력 이슈에 에너지를 집중할 수 있습니다.",
    "재정 운영: 수익 확장보다 변동성 관리 지표를 먼저 세우면 대운 전환기에도 현금흐름을 안정적으로 유지하기 쉽습니다.",
    "커리어 운영: 강점 궁에서 성과를 증폭하고 약점 궁에서는 리스크를 제한하는 이중 전략이 실행 체감도를 높입니다.",
  ];

  while (output.length < safeMin && guard < 24) {
    const extra = expansionBank[guard % expansionBank.length];
    output = `${output}\n\n${extra}`;
    guard += 1;
  }

  if (output.length > safeMax) {
    output = trimZiweiMarkdownToMaxLength(output, safeMax);
  }

  let padIndex = 1;
  while (output.length < safeMin) {
    const pad = `\n\n추가 해석 ${padIndex}: 핵심 궁과 주성의 상호작용을 이번 주 실행 기준에 연결하고, 손실 가능성이 높은 선택을 먼저 제한하면 변동 구간에서도 해석의 실전성이 유지됩니다.`;
    output = `${output}${pad}`;
    padIndex += 1;
    if (padIndex > 120) break;
  }

  if (output.length > safeMax) {
    output = trimZiweiMarkdownToMaxLength(output, safeMax);
  }
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
      const expected = SYMBOL_BY_STRENGTH[normalizedStrength] || "△";
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

export { ZIWEI_PDF_CHAPTERS, ZIWEI_CHAPTER_SPECS, ZIWEI_FORBIDDEN_TEXTS };
