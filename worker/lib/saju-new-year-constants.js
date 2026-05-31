export const SERVICE_KEY = "saju-new-year";
export const FEATURE_KEY = "premium_pdf_saju_new_year";
export const FEATURE_ALIASES = new Set(["saju_new_year_pdf", "premium-saju-newyear-report", "premium_pdf_saju_yearly"]);
export const COVER_IMAGE = "/fuctionassets/신년운세.webp";
export const NEW_YEAR_PDF_LOCK_TTL_MS = 15 * 60 * 1000;
export const FORBIDDEN_TEXT_RE = /\b(?:fallback|payload|json|debug|internal\s*server\s*error|undefined|null|nan|object|calculationmode|recovered|about:blank)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다/gi;
export const MIN_SECTION_CHARS = 500;
export const MIN_CHAPTER_CHARS = 3000;
export const MIN_TOTAL_CHARS = 35000;
export const MIN_CATEGORY_TEXT_LENGTH = 180;

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
  { no: 1, title: "Chapter I. 올해의 큰 흐름 — 세운이 여는 1년의 문", categories: ["올해 세운의 핵심 분위기", "원국과 올해 운의 만남", "올해 가장 강하게 떠오르는 주제", "올해 조심해야 할 반복 패턴", "올해의 기회와 압박", "올해를 여는 핵심 한 줄 조언"] },
  { no: 2, title: "Chapter II. 나의 원국과 올해의 관계 — 타고난 팔자와 세운의 충돌·조화", categories: ["일간이 올해 운을 받아들이는 방식", "월지와 세운이 만드는 현실 변화", "일지와 세운이 만드는 관계 변화", "천간에서 드러나는 기회와 부담", "지지에서 움직이는 사건의 흐름", "원국 전체로 본 올해의 방향"] },
  { no: 3, title: "Chapter III. 일과 커리어 운 — 올해 어디에서 성과가 나는가", categories: ["올해의 직업운 핵심", "인정받는 방식", "조직과 독립의 선택", "일에서 생기는 경쟁과 압박", "커리어 전환 또는 확장 가능성", "올해 일운을 살리는 전략"] },
  { no: 4, title: "Chapter IV. 재물운 — 돈이 들어오고 막히는 지점", categories: ["올해 돈이 들어오는 방식", "수익이 커지는 조건", "돈이 막히는 패턴", "투자·계약·가격 책정 주의점", "고정수익과 확장수익의 균형", "올해 재물운을 키우는 법"] },
  { no: 5, title: "Chapter V. 연애·결혼·관계운 — 사랑과 인연의 흐름", categories: ["올해 연애운의 분위기", "새로운 만남의 가능성", "기존 관계의 변화", "결혼과 진지한 관계의 흐름", "갈등이 생기기 쉬운 지점", "올해 사랑을 지키는 법"] },
  { no: 6, title: "Chapter VI. 인간관계와 귀인운 — 사람으로 열리고 사람으로 막히는 운", categories: ["올해 가까워지는 사람들", "귀인이 들어오는 방식", "피해야 할 사람과 관계 패턴", "협업과 팀워크의 흐름", "말과 오해로 생기는 문제", "올해 인맥을 기회로 바꾸는 법"] },
  { no: 7, title: "Chapter VII. 건강·멘탈·생활 리듬 — 버티는 해가 아니라 정비하는 해", categories: ["올해 체력의 흐름", "스트레스가 쌓이는 방식", "마음이 흔들리는 지점", "수면·식사·일상 루틴", "과로와 번아웃 주의점", "올해 건강운을 지키는 습관"] },
  { no: 8, title: "Chapter VIII. 월별 운세 — 12개월의 기회와 주의점", categories: ["1월·2월의 흐름", "3월·4월의 흐름", "5월·6월의 흐름", "7월·8월의 흐름", "9월·10월의 흐름", "11월·12월의 흐름"] },
  { no: 9, title: "Chapter IX. 위기와 반전 포인트 — 올해 무너지지 않는 법", categories: ["올해 가장 흔들리기 쉬운 순간", "반복될 수 있는 선택 실수", "돈과 일에서 조심할 장면", "관계에서 생길 수 있는 위기", "위기를 기회로 바꾸는 조건", "올해 반드시 피해야 할 태도"] },
  { no: 10, title: "Chapter X. 올해의 마스터플랜 — 1년을 내 편으로 쓰는 법", categories: ["올해 가장 먼저 해야 할 선택", "1분기 전략", "2분기 전략", "3분기 전략", "4분기 전략", "올해의 최종 운명 조언"] },
]);