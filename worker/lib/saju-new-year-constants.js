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
  { no: 1, title: "제 1장. {YEAR}년 총운과 세운의 문", categories: ["세운 간지와 올해의 첫 신호", "원국과 세운의 조화·충돌", "오행 강약과 용신·희신 방향", "가장 크게 바뀌는 삶의 영역", "올해를 지키는 핵심 기준"] },
  { no: 2, title: "제 2장. {YEAR}년 커리어와 일의 방향", categories: ["올해 일의 기본 흐름", "직장·조직·평가운", "이직·전환·확장 가능성", "성과가 열리는 방식", "피해야 할 업무 패턴"] },
  { no: 3, title: "제 3장. {YEAR}년 재물운과 돈의 흐름", categories: ["돈이 들어오는 방식", "고정수익과 확장수익", "큰 지출과 손실 주의", "계약·투자·가격 결정", "재물운을 살리는 습관"] },
  { no: 4, title: "제 4장. {YEAR}년 인간관계와 귀인운", categories: ["올해 가까워지는 사람", "귀인이 들어오는 통로", "협업과 파트너십", "멀어질 관계와 갈등 신호", "관계를 넓히는 전략"] },
  { no: 5, title: "제 5장. {YEAR}년 연애·결혼·가족운", categories: ["연애운의 전체 흐름", "새로운 인연과 기존 관계", "결혼·약속·장기 관계", "가족과 가까운 사람의 책임", "감정 기복과 거리 조절"] },
  { no: 6, title: "제 6장. {YEAR}년 건강과 심리 리듬", categories: ["오행으로 보는 몸의 신호", "피로와 스트레스 누적 구간", "마음이 흔들리는 이유", "회복력을 높이는 생활 리듬", "건강·멘탈 관리 원칙"] },
  { no: 7, title: "제 7장. {YEAR}년 분기별 의사결정", categories: ["1분기 선택과 정리", "2분기 확장과 검증", "3분기 조율과 회수", "4분기 마무리와 재설계", "가장 중요한 결정 타이밍"] },
  { no: 8, title: "제 8장. {YEAR}년 위험 관리와 반전 전략", categories: ["가장 흔들리기 쉬운 문제", "합충형파해와 사건 신호", "반복하면 안 되는 실수", "위기가 기회로 바뀌는 조건", "위험을 낮추는 회복 플랜"] },
  { no: 9, title: "제 9장. {YEAR}년 12개월 Go/Stop 월별 지도", categories: ["상반기 월별 흐름", "하반기 월별 흐름", "주의해야 할 달", "기회를 잡기 좋은 달", "월별 Go/Stop 실행표"] },
  { no: 10, title: "제 10장. {YEAR}년 최종 신년 로드맵", categories: ["올해의 최종 메시지", "먼저 정리해야 할 것", "반드시 밀어붙일 것", "내려놓아야 할 것", "1년 실행 루틴"] },
]);
