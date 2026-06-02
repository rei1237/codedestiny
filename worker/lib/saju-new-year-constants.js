export const SERVICE_KEY = "saju-new-year";
export const FEATURE_KEY = "premium_pdf_saju_new_year";
export const FEATURE_ALIASES = new Set(["saju_new_year_pdf", "premium-saju-newyear-report", "premium_pdf_saju_yearly"]);
export const COVER_IMAGE = "/fuctionassets/신년운세.webp";
export const NEW_YEAR_PDF_LOCK_TTL_MS = 15 * 60 * 1000;
export const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|internal\s*server\s*error|undefined|null|nan|object|calculationmode|recovered|about:blank|llm|api|engine|validation|retry|seed|skeleton|local)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|자동\s*생성|템플릿|계산\s*시그니처|내부\s*데이터|로컬\s*기반|생성\s*로직|챕터\s*생성기|카테고리\s*렌더러/gi;
export const MIN_SECTION_CHARS = 700;
export const MIN_CHAPTER_CHARS = 4200;
export const MIN_TOTAL_CHARS = 45000;
export const MIN_CATEGORY_TEXT_LENGTH = 700;

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
export const STEM_ELEMENT = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water" };
export const STEM_YINYANG = { 甲: "yang", 乙: "yin", 丙: "yang", 丁: "yin", 戊: "yang", 己: "yin", 庚: "yang", 辛: "yin", 壬: "yang", 癸: "yin" };
export const BRANCH_ELEMENT = { 子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire", 午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water" };
export const ELEMENT_KO = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
export const GENERATES = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
export const CONTROLS = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
export const BRANCH_COMBOS = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
export const BRANCH_CLASHES = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
export const BRANCH_HARMS = { 子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅", 卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉" };
export const BRANCH_BREAKS = { 子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅", 卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未" };

export const NEW_YEAR_CHAPTERS = Object.freeze([
  { no: 1, title: "{YEAR}년 올해의 총운", categories: ["올해의 핵심 기운", "원국과 세운의 만남", "현재 대운이 주는 영향", "가장 크게 바뀌는 영역", "올해 지켜야 할 기준"] },
  { no: 2, title: "{YEAR}년 일과 커리어 흐름", categories: ["올해 일의 기본 방향", "직장과 조직운", "이직·전환·확장 가능성", "성과가 나는 방식", "커리어 실전 전략"] },
  { no: 3, title: "{YEAR}년 재물운과 소비 전략", categories: ["돈이 들어오는 방식", "돈이 새는 패턴", "투자와 확장에 대한 주의", "지출 구조 정리", "재물운을 살리는 행동"] },
  { no: 4, title: "{YEAR}년 인간관계와 귀인운", categories: ["올해 만나는 사람의 성격", "귀인이 들어오는 방식", "정리해야 할 관계", "갈등이 생기기 쉬운 관계", "관계 확장 전략"] },
  { no: 5, title: "{YEAR}년 연애운과 결혼운", categories: ["올해의 연애 흐름", "새로운 인연 가능성", "기존 관계의 변화", "결혼을 생각할 때의 기준", "감정적으로 조절할 부분"] },
  { no: 6, title: "{YEAR}년 가족과 가까운 사람의 흐름", categories: ["가족 관계의 이슈", "가까운 사람과의 책임", "의존과 거리감", "집안 문제를 다루는 방식", "감정 소모를 줄이는 기준"] },
  { no: 7, title: "{YEAR}년 건강과 컨디션 관리", categories: ["몸의 리듬", "오행 균형에 따른 관리", "스트레스가 쌓이는 방식", "수면과 회복", "장기적으로 관리할 습관"] },
  { no: 8, title: "{YEAR}년 마음의 흐름과 심리 변화", categories: ["감정의 기본 패턴", "불안과 압박이 생기는 구간", "자존감이 흔들리는 이유", "마음이 회복되는 방식", "멘탈 관리 전략"] },
  { no: 9, title: "{YEAR}년 신살과 합충형파해", categories: ["올해 주목할 신살", "합이 만드는 기회", "충이 만드는 변화", "형파해가 주는 긴장", "사건을 다루는 현실적 태도"] },
  { no: 10, title: "{YEAR}년 월별 운세 흐름", categories: ["1분기 흐름", "2분기 흐름", "3분기 흐름", "4분기 흐름", "중요한 달과 조절할 달"] },
  { no: 11, title: "{YEAR}년 기회와 위기 관리", categories: ["올해의 가장 큰 기회", "주의해야 할 선택", "반복하면 안 되는 실수", "위기가 기회로 바뀌는 조건", "위험을 낮추는 운영법"] },
  { no: 12, title: "{YEAR}년 최종 실천 로드맵", categories: ["올해의 최종 메시지", "먼저 정리해야 할 것", "반드시 밀어붙일 것", "내려놓아야 할 것", "월별 실행 루틴"] },
]);
