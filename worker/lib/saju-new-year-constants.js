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
  { no: 1, title: "제 1장. 올해의 전체 운세 총론", categories: ["올해의 핵심 기운", "올해 나에게 가장 크게 작용하는 십성", "원국과 세운이 만나는 방식", "올해 가장 좋아지는 영역", "올해 가장 조심해야 할 흐름"] },
  { no: 2, title: "제 2장. 대운과 세운이 만드는 올해의 흐름", categories: ["현재 대운의 기본 방향", "올해 세운이 대운 위에 얹히는 방식", "올해 기회가 열리는 타이밍", "올해 부담이 커지는 지점", "대운과 세운을 잘 쓰는 법"] },
  { no: 3, title: "제 3장. 일과 커리어 운세", categories: ["올해 일에서 열리는 기회", "직업적 방향 전환 가능성", "인정받기 쉬운 방식", "일에서 조심해야 할 실수", "올해 커리어 전략"] },
  { no: 4, title: "제 4장. 재물과 돈의 흐름", categories: ["올해 돈이 들어오는 방식", "지출이 커질 수 있는 이유", "투자와 확장에 대한 주의점", "돈을 지키는 방식", "올해 재물운을 키우는 전략"] },
  { no: 5, title: "제 5장. 인간관계와 귀인운", categories: ["올해 가까워지는 사람들", "도움을 받을 수 있는 관계", "멀어질 수 있는 인연", "갈등이 생기는 이유", "좋은 인연을 붙잡는 태도"] },
  { no: 6, title: "제 6장. 연애와 결혼운", categories: ["올해 연애 기운의 강도", "새로운 인연이 들어오는 방식", "기존 관계에서 드러나는 문제", "결혼이나 장기 관계 가능성", "사랑에서 조심해야 할 태도"] },
  { no: 7, title: "제 7장. 건강과 심리 리듬", categories: ["올해 몸이 예민해지는 부분", "마음이 흔들리는 시기", "스트레스가 쌓이는 방식", "회복력을 높이는 생활 리듬", "건강운을 지키는 조언"] },
  { no: 8, title: "제 8장. 월별 운세 흐름", categories: ["상반기 흐름", "하반기 흐름", "조심해야 할 달", "기회를 잡기 좋은 달", "월별 운세 활용법"] },
  { no: 9, title: "제 9장. 올해의 위기와 반전 포인트", categories: ["올해 가장 흔들리기 쉬운 문제", "반복될 수 있는 실수", "위기가 기회로 바뀌는 조건", "피해야 할 선택", "반전을 만드는 행동"] },
  { no: 10, title: "제 10장. 올해를 위한 최종 마스터플랜", categories: ["올해의 핵심 메시지", "가장 먼저 정리해야 할 것", "반드시 밀어붙여야 할 것", "내려놓아야 할 것", "1년을 잘 보내기 위한 실전 전략"] },
]);