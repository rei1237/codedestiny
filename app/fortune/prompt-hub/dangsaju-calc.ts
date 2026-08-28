import { lunarToSolar, solarToLunar } from "@/lib/korean-calendar";
import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { calculateLocalSaju, type LocalSajuResult, type SajuPillarLocal } from "../../saju/animal-destiny/engine/localSajuCalculator";

export type DangsajuMode = "basic" | "compatibility";
export type DangsajuCalendarType = "solar" | "lunar" | "lunarLeap";
export type DangsajuGender = "male" | "female" | "other" | "";
export type DangsajuConfidence = "high" | "medium" | "low";
export type DangsajuStageName = "초년" | "청년" | "중년" | "말년";
export type DangsajuStarName =
  | "천귀성"
  | "천액성"
  | "천권성"
  | "천파성"
  | "천간성"
  | "천문성"
  | "천복성"
  | "천역성"
  | "천고성"
  | "천인성"
  | "천예성"
  | "천수성";

export type NormalizedBirthForDangsaju = {
  name?: string;
  gender?: string;
  inputCalendarType: DangsajuCalendarType;
  inputBirthDate: string;
  solarDate: string;
  lunarDate: string;
  isLeapMonth: boolean;
  birthTime?: string;
  hourBranch?: string;
  yearBranch: string;
  monthBranch?: string;
  dayBranch?: string;
  timeBranch?: string;
  pillars?: {
    year?: string;
    month?: string;
    day?: string;
    hour?: string;
  };
  timezone: string;
  confidence: DangsajuConfidence;
  warnings: string[];
};

export type DangsajuStageResult = {
  stageName: DangsajuStageName;
  starName: DangsajuStarName | "미산출";
  branch?: string;
  keywords: string[];
  summary: string;
};

export type DangsajuChartResult = {
  mode: "basic";
  modeLabel: string;
  question: string;
  baseDate: string;
  normalizedBirth: NormalizedBirthForDangsaju;
  stages: {
    early: DangsajuStageResult;
    youth: DangsajuStageResult;
    middle: DangsajuStageResult;
    later: DangsajuStageResult;
  };
  corePattern: string;
  strengthKeywords: string[];
  cautionKeywords: string[];
  actionAdvice: {
    reduce: string[];
    increase: string[];
  };
  warnings: string[];
};

export type DangsajuCompatibilityResult = {
  mode: "compatibility";
  modeLabel: string;
  personA: DangsajuChartResult;
  personB: DangsajuChartResult;
  relationshipType: string;
  question: string;
  baseDate: string;
  compatibilitySummary: string;
  harmonyPoints: string[];
  conflictPoints: string[];
  adviceForA: string[];
  adviceForB: string[];
  finalMessage: string;
  warnings: string[];
};

export type DangsajuResult = DangsajuChartResult | DangsajuCompatibilityResult;

type DangsajuCalcCopy = {
  modeBasicLabel: string;
  modeBasicDescription: string;
  modeCompatibilityLabel: string;
  modeCompatibilityDescription: string;
  calendarLunarLeap: string;
  calendarLunar: string;
  calendarSolar: string;
};

type DangsajuCalcTextKey = keyof DangsajuCalcCopy;

const DANGSAJU_CALC_TEXT_TRANSLATIONS: Partial<Record<LoadingLocale, DangsajuCalcCopy>> = {
  ko: {
    modeBasicLabel: "당사주 기본차트 해석",
    modeBasicDescription: "당사주로 보는 초년·청년·중년·말년을 알려드립니다.",
    modeCompatibilityLabel: "당사주 궁합",
    modeCompatibilityDescription: "두 사람의 당사주 궁합을 풀이합니다.",
    calendarLunarLeap: "음력 윤달",
    calendarLunar: "음력",
    calendarSolar: "양력",
  },
  en: {
    modeBasicLabel: "Dangsaju Life Chart",
    modeBasicDescription: "Read the early, youth, middle, and later-life currents through Dangsaju.",
    modeCompatibilityLabel: "Dangsaju Compatibility",
    modeCompatibilityDescription: "Unfold the compatibility between two people through Dangsaju.",
    calendarLunarLeap: "Lunar leap month",
    calendarLunar: "Lunar",
    calendarSolar: "Solar",
  },
  ja: {
    modeBasicLabel: "唐四柱 基本チャート",
    modeBasicDescription: "唐四柱で幼年・青年・中年・晩年の流れを読み解きます。",
    modeCompatibilityLabel: "唐四柱 相性",
    modeCompatibilityDescription: "二人の唐四柱の相性をやわらかく読み解きます。",
    calendarLunarLeap: "旧暦 うるう月",
    calendarLunar: "旧暦",
    calendarSolar: "新暦",
  },
  "zh-CN": {
    modeBasicLabel: "唐四柱基础命盘",
    modeBasicDescription: "以唐四柱解读早年、青年、中年与晚年的命运流向。",
    modeCompatibilityLabel: "唐四柱合盘",
    modeCompatibilityDescription: "通过唐四柱细读两个人的缘分与相处节奏。",
    calendarLunarLeap: "农历闰月",
    calendarLunar: "农历",
    calendarSolar: "公历",
  },
  "zh-TW": {
    modeBasicLabel: "唐四柱基礎命盤",
    modeBasicDescription: "以唐四柱解讀早年、青年、中年與晚年的命運流向。",
    modeCompatibilityLabel: "唐四柱合盤",
    modeCompatibilityDescription: "透過唐四柱細讀兩個人的緣分與相處節奏。",
    calendarLunarLeap: "農曆閏月",
    calendarLunar: "農曆",
    calendarSolar: "國曆",
  },
};

function dangsajuCalcText(key: DangsajuCalcTextKey, locale?: LoadingLocale | string | null) {
  const activeLocale = locale ? normalizeLoadingLocale(locale) : getCurrentLoadingLocale();
  return DANGSAJU_CALC_TEXT_TRANSLATIONS[activeLocale]?.[key]
    ?? DANGSAJU_CALC_TEXT_TRANSLATIONS.en?.[key]
    ?? DANGSAJU_CALC_TEXT_TRANSLATIONS.ko![key];
}

export function getDangsajuModes(locale?: LoadingLocale | string | null) {
  return [
    { id: "basic" as const, label: dangsajuCalcText("modeBasicLabel", locale), description: dangsajuCalcText("modeBasicDescription", locale) },
    { id: "compatibility" as const, label: dangsajuCalcText("modeCompatibilityLabel", locale), description: dangsajuCalcText("modeCompatibilityDescription", locale) },
  ];
}

export const DANGSAJU_MODES = getDangsajuModes();

export const DANGSAJU_RELATIONSHIP_TYPES = ["연애", "결혼", "썸", "재회", "친구", "가족", "사업 파트너", "직장 관계", "기타"];

export const DANGSAJU_STARS: DangsajuStarName[] = [
  "천귀성",
  "천액성",
  "천권성",
  "천파성",
  "천간성",
  "천문성",
  "천복성",
  "천역성",
  "천고성",
  "천인성",
  "천예성",
  "천수성",
];

export const DANGSAJU_BRANCH_TO_STAR: Record<string, DangsajuStarName> = {
  자: "천귀성",
  축: "천액성",
  인: "천권성",
  묘: "천파성",
  진: "천간성",
  사: "천문성",
  오: "천복성",
  미: "천역성",
  신: "천고성",
  유: "천인성",
  술: "천예성",
  해: "천수성",
};

export const DANGSAJU_STAR_MEANINGS: Record<DangsajuStarName, {
  keywords: string[];
  strength: string[];
  caution: string[];
  reduce: string[];
  increase: string[];
  summary: string;
}> = {
  천귀성: {
    keywords: ["귀함", "도움", "품격", "보호"],
    strength: ["사람의 도움을 끌어오는 힘", "품위를 지키는 태도", "위기에서 중심을 회복하는 감각"],
    caution: ["기대 의존", "체면 과잉", "결정 지연"],
    reduce: ["타인의 인정만 기다리는 태도", "체면 때문에 미루는 선택", "좋은 말만 듣고 움직이는 습관"],
    increase: ["도움을 요청하는 용기", "내 기준을 먼저 세우는 습관", "작은 성취를 꾸준히 쌓는 태도"],
    summary: "천귀성은 도움과 품격의 별이라, 좋은 인연을 만나도 스스로 기준을 세울 때 복이 오래 머뭅니다.",
  },
  천액성: {
    keywords: ["변수", "부담", "회복", "정리"],
    strength: ["위기를 견디는 힘", "문제를 현실적으로 고치는 능력", "불필요한 것을 덜어내는 감각"],
    caution: ["걱정 과잉", "피로 누적", "불리한 책임 떠안기"],
    reduce: ["혼자 감당하는 습관", "미리 겁먹는 생각", "손실을 숨기는 태도"],
    increase: ["문제의 우선순위 정리", "회복 시간 확보", "도움을 구체적으로 요청하기"],
    summary: "천액성은 부담을 통해 정리력을 키우는 별이라, 무리한 확장보다 회복과 정돈이 운을 살립니다.",
  },
  천권성: {
    keywords: ["주도권", "책임", "권위", "결단"],
    strength: ["리더십", "끝까지 책임지는 힘", "방향을 잡는 결단력"],
    caution: ["통제 과잉", "완고함", "책임 독점"],
    reduce: ["내 방식만 고집하기", "모든 일을 직접 통제하기", "타인의 속도를 무시하기"],
    increase: ["권한을 나누는 태도", "결정 기준 문서화", "책임과 휴식의 균형"],
    summary: "천권성은 책임과 주도권의 별이라, 이끄는 힘은 강하지만 나누는 법을 배울수록 길이 넓어집니다.",
  },
  천파성: {
    keywords: ["변화", "분리", "돌파", "재편"],
    strength: ["낡은 틀을 깨는 힘", "새 국면으로 넘어가는 용기", "정체를 벗어나는 추진력"],
    caution: ["성급한 단절", "충동 선택", "말의 날카로움"],
    reduce: ["감정적인 결별 선언", "준비 없는 전환", "상대를 몰아붙이는 말"],
    increase: ["출구 전략 만들기", "작게 시험한 뒤 바꾸기", "변화 이유를 차분히 설명하기"],
    summary: "천파성은 바꾸고 끊어내는 힘이 강해, 변화 자체보다 순서와 준비가 운의 품질을 좌우합니다.",
  },
  천간성: {
    keywords: ["고독", "집중", "기준", "탐구"],
    strength: ["깊이 파고드는 힘", "혼자 버티는 집중력", "원칙을 세우는 능력"],
    caution: ["고립", "차가운 표현", "도움 거절"],
    reduce: ["혼자 결론내기", "감정을 설명하지 않는 태도", "완벽해질 때까지 숨는 습관"],
    increase: ["중간 공유", "기준을 말로 풀기", "신뢰할 사람과의 정기 대화"],
    summary: "천간성은 고요한 집중의 별이라, 혼자 깊어지는 힘을 관계 안에서 나눌 때 막힘이 풀립니다.",
  },
  천문성: {
    keywords: ["학습", "문서", "통찰", "말"],
    strength: ["배우고 정리하는 능력", "문서와 말의 설득력", "상황을 읽는 눈"],
    caution: ["생각 과잉", "말만 앞섬", "판단 지연"],
    reduce: ["정보만 더 모으기", "말로만 정리하기", "실행 전 과도한 비교"],
    increase: ["메모와 실행 연결", "배운 것을 가르치기", "질문을 좁히는 습관"],
    summary: "천문성은 문과 지혜의 별이라, 아는 것을 현실 행동으로 옮길 때 빛이 강해집니다.",
  },
  천복성: {
    keywords: ["복록", "안정", "보호", "생활력"],
    strength: ["기반을 만드는 힘", "꾸준한 생활력", "사람을 편안하게 하는 기운"],
    caution: ["안주", "느린 결단", "익숙함에 머무름"],
    reduce: ["편한 선택만 반복하기", "변화를 지나치게 미루기", "작은 불만을 쌓아두기"],
    increase: ["기반 관리", "재정 루틴", "안정 속 작은 도전"],
    summary: "천복성은 안정과 복록의 별이라, 가진 기반을 정성껏 관리할수록 삶이 단단해집니다.",
  },
  천역성: {
    keywords: ["이동", "역할 변화", "바쁨", "확장"],
    strength: ["움직이며 기회를 찾는 힘", "환경 적응력", "새 역할을 맡는 용기"],
    caution: ["과로", "불안정", "마무리 부족"],
    reduce: ["일을 너무 많이 벌리기", "휴식 없는 이동", "마감 없는 약속"],
    increase: ["이동 후 정리", "역할 경계", "체력 회복 루틴"],
    summary: "천역성은 움직임의 별이라, 이동과 변화는 좋지만 마무리와 회복이 함께 가야 운이 안정됩니다.",
  },
  천고성: {
    keywords: ["축적", "인내", "정리", "내공"],
    strength: ["오래 쌓는 힘", "기록과 관리 능력", "위기를 견디는 내공"],
    caution: ["답답함", "과거 집착", "폐쇄성"],
    reduce: ["낡은 방식만 붙잡기", "속마음을 쌓아두기", "변화를 거부하기"],
    increase: ["기록을 자산화하기", "정리 후 새 기준 만들기", "천천히 공개하기"],
    summary: "천고성은 축적의 별이라, 느려 보여도 오래 남는 결과를 만드는 흐름이 강합니다.",
  },
  천인성: {
    keywords: ["사람", "협력", "중재", "인연"],
    strength: ["사람을 잇는 능력", "상황을 부드럽게 중재하는 힘", "관계 감각"],
    caution: ["눈치 과잉", "경계 흐림", "타인 문제 개입"],
    reduce: ["모두를 만족시키려 하기", "내 몫을 양보만 하기", "갈등을 덮기만 하기"],
    increase: ["경계선 합의", "확인 질문", "서로의 책임 나누기"],
    summary: "천인성은 인연과 협력의 별이라, 좋은 관계도 경계가 분명할 때 오래 갑니다.",
  },
  천예성: {
    keywords: ["감각", "표현", "재능", "매력"],
    strength: ["표현력", "미감과 재능", "사람의 마음을 움직이는 감각"],
    caution: ["기분 의존", "산만함", "평가 민감"],
    reduce: ["감정에 따라 방향 바꾸기", "칭찬에만 기대기", "재능을 숨기기"],
    increase: ["꾸준한 발표", "감각을 결과물로 만들기", "피드백을 선별해 듣기"],
    summary: "천예성은 표현과 재능의 별이라, 감각을 꾸준한 결과물로 만들 때 매력이 운으로 바뀝니다.",
  },
  천수성: {
    keywords: ["지혜", "완성", "내면", "정리"],
    strength: ["긴 흐름을 보는 눈", "마무리 능력", "내면의 지혜"],
    caution: ["늦은 결단", "체념", "거리두기 과잉"],
    reduce: ["이미 끝났다고 단정하기", "혼자 물러서기", "실행 없는 관찰"],
    increase: ["결론을 행동으로 옮기기", "경험을 나누기", "장기 전략 세우기"],
    summary: "천수성은 완성과 지혜의 별이라, 지나온 경험을 현재의 선택으로 연결할 때 깊은 힘이 납니다.",
  },
};

const BRANCH_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};

const GENERATES: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<string, string> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) throw new Error("생년월일은 YYYY-MM-DD 형식으로 입력해주세요.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // 🔴 UTC 축으로 왕복한다. 로컬 Date 로 재면 그 벽시계가 없는 타임존(서머타임 시계 앞당김)에서
  // JS 가 조용히 접어 **유효한 생일을 거부**한다. 2월 30일은 UTC 축에서도 그대로 걸러진다.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("생년월일을 다시 확인해주세요.");
  }
  return { year, month, day, text: formatDateParts(year, month, day) };
}

function parseBirthTime(value: string, timeUnknown: boolean) {
  if (timeUnknown) return { hour: undefined as number | undefined, minute: undefined as number | undefined, text: "모름", hasTime: false };
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) throw new Error("출생시간은 HH:mm 형식으로 입력하거나 모름을 선택해주세요.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("출생시간 범위를 다시 확인해주세요.");
  return { hour, minute, text: `${pad2(hour)}:${pad2(minute)}`, hasTime: true };
}

function normalizeCalendarType(value: DangsajuCalendarType) {
  return value === "lunarLeap" ? { engine: "lunar" as const, leap: true, label: dangsajuCalcText("calendarLunarLeap") } : value === "lunar"
    ? { engine: "lunar" as const, leap: false, label: dangsajuCalcText("calendarLunar") }
    : { engine: "solar" as const, leap: false, label: dangsajuCalcText("calendarSolar") };
}

function solarFromInput(year: number, month: number, day: number, calendarType: DangsajuCalendarType) {
  if (calendarType === "solar") return { year, month, day };
  // 🔴 두 방향 모두 한국 음양력 코어가 한다. 중국 음력은 삭이 CST 23시대에 들면 그 달 전체가
  //    하루 밀린다 — 실측 2026-08-27: 양력→음력 3.67% · 음력→양력 3.68%.
  const solar = lunarToSolar(year, Math.abs(month), day, calendarType === "lunarLeap");
  if (!solar) throw new RangeError("음력 생년월일을 양력으로 옮기지 못했습니다(지원 1900~2100).");
  return { year: solar.year, month: solar.month, day: solar.day };
}

// 생시는 음력일을 바꾸지 않으므로 코어는 날짜만 받는다.
function lunarFromSolar(year: number, month: number, day: number) {
  const lunar = solarToLunar(year, month, day);
  if (!lunar) throw new RangeError("양력 생년월일을 음력으로 옮기지 못했습니다(지원 1900~2100).");
  return {
    year: lunar.lunarYear,
    month: lunar.lunarMonth,
    day: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
    text: formatDateParts(lunar.lunarYear, lunar.lunarMonth, lunar.lunarDay),
  };
}

function pillarText(pillar?: SajuPillarLocal | null) {
  return pillar?.ganji || "";
}

function starForBranch(branch?: string): DangsajuStarName | "미산출" {
  return branch ? DANGSAJU_BRANCH_TO_STAR[branch] || "미산출" : "미산출";
}

function stageFor(stageName: DangsajuStageName, branch?: string): DangsajuStageResult {
  const starName = starForBranch(branch);
  if (starName === "미산출") {
    return {
      stageName,
      starName,
      branch,
      keywords: ["출생시간 미상", "제한 해석"],
      summary: `${stageName} 흐름은 해당 지지가 미산출되어 큰 흐름 위주로 읽어야 합니다.`,
    };
  }
  const meaning = DANGSAJU_STAR_MEANINGS[starName];
  return {
    stageName,
    starName,
    branch,
    keywords: meaning.keywords,
    summary: meaning.summary,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function relationByBranches(a?: string, b?: string) {
  const aElement = a ? BRANCH_ELEMENT[a] : "";
  const bElement = b ? BRANCH_ELEMENT[b] : "";
  if (!aElement || !bElement) return "한쪽 지지가 미산출되어 관계 흐름은 제한적으로 봅니다.";
  if (aElement === bElement) return `${aElement} 기운이 반복되어 비슷한 장점과 고집이 함께 커집니다.`;
  if (GENERATES[aElement] === bElement) return `A의 ${aElement} 기운이 B의 ${bElement} 기운을 생해 A가 관계를 움직이기 쉽습니다.`;
  if (GENERATES[bElement] === aElement) return `B의 ${bElement} 기운이 A의 ${aElement} 기운을 생해 B가 관계를 돕기 쉽습니다.`;
  if (CONTROLS[aElement] === bElement) return `A의 ${aElement} 기운이 B의 ${bElement} 기운을 누르기 쉬워 속도 조절이 필요합니다.`;
  if (CONTROLS[bElement] === aElement) return `B의 ${bElement} 기운이 A의 ${aElement} 기운을 누르기 쉬워 역할 경계가 필요합니다.`;
  return "두 사람의 지지 오행은 추가 맥락과 함께 읽어야 합니다.";
}

export function getDangsajuQuestionNotice(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const questionMarks = (trimmed.match(/[?？]/g) || []).length;
  if (questionMarks > 1 || /\b(그리고|또|동시에|둘 다|여러 가지|각각)\b/u.test(trimmed)) {
    return "당사주는 하나의 주제를 중심으로 초년·청년·중년·말년 흐름을 읽을 때 더 안정적입니다.";
  }
  return "";
}

export function normalizeBirthWithSajuEngine(input: {
  name?: string;
  gender?: string;
  birthDate: string;
  calendarType: DangsajuCalendarType;
  birthTime: string;
  timeUnknown: boolean;
}) {
  const birth = parseBirthDate(input.birthDate);
  const time = parseBirthTime(input.birthTime, input.timeUnknown);
  const calendar = normalizeCalendarType(input.calendarType);
  const solarDate = solarFromInput(birth.year, birth.month, birth.day, input.calendarType);
  const lunarDate = lunarFromSolar(solarDate.year, solarDate.month, solarDate.day);
  const warnings: string[] = [];
  if (input.timeUnknown) warnings.push("출생시간 미상으로 시성 또는 말년 흐름은 제한 해석합니다.");

  const local: LocalSajuResult = calculateLocalSaju({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: time.hour,
    minute: time.minute,
    hasTime: time.hasTime,
    calendarType: calendar.engine,
    lunarLeap: calendar.leap,
    timezone: "Asia/Seoul",
    gender: input.gender === "male" ? "male" : input.gender === "female" ? "female" : "unknown",
  });

  const confidence: DangsajuConfidence = input.timeUnknown ? "medium" : "high";
  return {
    name: input.name?.trim(),
    gender: input.gender || "",
    inputCalendarType: input.calendarType,
    inputBirthDate: birth.text,
    solarDate: formatDateParts(solarDate.year, solarDate.month, solarDate.day),
    lunarDate: lunarDate.text,
    isLeapMonth: lunarDate.isLeapMonth,
    birthTime: time.text,
    hourBranch: local.pillars.hour?.branch,
    yearBranch: local.pillars.year.branch,
    monthBranch: local.pillars.month.branch,
    dayBranch: local.pillars.day.branch,
    timeBranch: local.pillars.hour?.branch,
    pillars: {
      year: pillarText(local.pillars.year),
      month: pillarText(local.pillars.month),
      day: pillarText(local.pillars.day),
      hour: pillarText(local.pillars.hour) || undefined,
    },
    timezone: local.timezone || "Asia/Seoul",
    confidence,
    warnings,
  } satisfies NormalizedBirthForDangsaju;
}

export function calculateDangsajuChart(input: {
  modeLabel?: string;
  name?: string;
  gender?: string;
  birthDate: string;
  calendarType: DangsajuCalendarType;
  birthTime: string;
  timeUnknown: boolean;
  question: string;
  baseDate: string;
}) {
  const normalizedBirth = normalizeBirthWithSajuEngine(input);
  const stages = {
    early: stageFor("초년", normalizedBirth.yearBranch),
    youth: stageFor("청년", normalizedBirth.monthBranch),
    middle: stageFor("중년", normalizedBirth.dayBranch),
    later: stageFor("말년", normalizedBirth.timeBranch),
  };
  const stageList = [stages.early, stages.youth, stages.middle, stages.later];
  const validMeanings = stageList
    .map((stage) => (stage.starName === "미산출" ? null : DANGSAJU_STAR_MEANINGS[stage.starName]))
    .filter((item): item is (typeof DANGSAJU_STAR_MEANINGS)[DangsajuStarName] => Boolean(item));
  const strengthKeywords = unique(validMeanings.flatMap((item) => item.strength)).slice(0, 6);
  const cautionKeywords = unique(validMeanings.flatMap((item) => item.caution)).slice(0, 6);
  const reduce = unique(validMeanings.flatMap((item) => item.reduce)).slice(0, 3);
  const increase = unique(validMeanings.flatMap((item) => item.increase)).slice(0, 3);
  const corePattern = `${stages.early.starName}에서 ${stages.middle.starName}을 지나 ${stages.later.starName}으로 이어지는 흐름입니다. 반복되는 선택 패턴은 ${stageList.map((stage) => stage.keywords[0]).filter(Boolean).join(", ")}에 머뭅니다.`;
  const warnings = [...normalizedBirth.warnings];
  return {
    mode: "basic",
    modeLabel: input.modeLabel || "당사주 기본차트 해석",
    question: input.question.trim(),
    baseDate: input.baseDate,
    normalizedBirth,
    stages,
    corePattern,
    strengthKeywords,
    cautionKeywords,
    actionAdvice: { reduce, increase },
    warnings,
  } satisfies DangsajuChartResult;
}

export function calculateDangsajuCompatibility(input: {
  modeLabel?: string;
  personA: {
    name?: string;
    gender?: string;
    birthDate: string;
    calendarType: DangsajuCalendarType;
    birthTime: string;
    timeUnknown: boolean;
  };
  personB: {
    name?: string;
    gender?: string;
    birthDate: string;
    calendarType: DangsajuCalendarType;
    birthTime: string;
    timeUnknown: boolean;
  };
  relationshipType: string;
  question: string;
  baseDate: string;
}) {
  const personA = calculateDangsajuChart({
    modeLabel: "A 당사주",
    ...input.personA,
    question: input.question,
    baseDate: input.baseDate,
  });
  const personB = calculateDangsajuChart({
    modeLabel: "B 당사주",
    ...input.personB,
    question: input.question,
    baseDate: input.baseDate,
  });
  const harmonyPoints = unique([
    relationByBranches(personA.normalizedBirth.yearBranch, personB.normalizedBirth.yearBranch),
    relationByBranches(personA.normalizedBirth.dayBranch, personB.normalizedBirth.dayBranch),
    personA.stages.middle.starName === personB.stages.middle.starName
      ? `중년 흐름이 같은 ${personA.stages.middle.starName}으로 만나 현실 판단 방식이 닮아 있습니다.`
      : "",
    personA.stages.youth.starName === personB.stages.youth.starName
      ? `청년 흐름이 같은 ${personA.stages.youth.starName}이라 사회적 속도감이 비슷합니다.`
      : "",
  ]).slice(0, 4);
  const conflictPoints = unique([
    personA.stages.early.starName !== personB.stages.early.starName
      ? `초년 별이 달라 익숙한 반응 방식이 다르게 시작됩니다.`
      : "",
    personA.stages.later.starName !== personB.stages.later.starName
      ? `말년 흐름이 달라 안정과 정리의 속도를 맞추는 연습이 필요합니다.`
      : "",
    relationByBranches(personA.normalizedBirth.monthBranch, personB.normalizedBirth.monthBranch),
  ]).slice(0, 4);
  const compatibilitySummary = `${input.relationshipType} 관계에서 A는 ${personA.stages.middle.starName}, B는 ${personB.stages.middle.starName} 흐름이 중심에 섭니다. 조화는 공통 리듬을 살리고, 충돌은 역할과 속도 차이를 조정할 때 안정됩니다.`;
  return {
    mode: "compatibility",
    modeLabel: input.modeLabel || "당사주 궁합",
    personA,
    personB,
    relationshipType: input.relationshipType,
    question: input.question.trim(),
    baseDate: input.baseDate,
    compatibilitySummary,
    harmonyPoints,
    conflictPoints,
    adviceForA: personA.actionAdvice.increase,
    adviceForB: personB.actionAdvice.increase,
    finalMessage: "서로의 흐름을 고치려 하기보다, 강하게 반복되는 반응을 알고 생활 규칙으로 조정할 때 관계가 오래 갑니다.",
    warnings: unique([...personA.warnings, ...personB.warnings]),
  } satisfies DangsajuCompatibilityResult;
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "미산출";
}

function formatPillars(normalized: NormalizedBirthForDangsaju) {
  const pillars = normalized.pillars || {};
  return [
    pillars.year ? `연주 ${pillars.year}` : "",
    pillars.month ? `월주 ${pillars.month}` : "",
    pillars.day ? `일주 ${pillars.day}` : "",
    pillars.hour ? `시주 ${pillars.hour}` : "시주 미산출",
  ].filter(Boolean).join(" / ");
}

export function buildDangsajuPrompt(result: DangsajuResult) {
  if (result.mode === "compatibility") return buildDangsajuCompatibilityPrompt(result);
  return buildDangsajuBasicPrompt(result);
}

function buildStageLine(stage: DangsajuStageResult) {
  return `${stage.stageName}: ${stage.starName} / ${formatList(stage.keywords)} / ${stage.summary}`;
}

function buildDangsajuBasicPrompt(result: DangsajuChartResult) {
  const normalized = result.normalizedBirth;
  return `[당사주 계산 요약]
선택 메뉴: ${result.modeLabel}
이름 또는 별칭: ${normalized.name || "미입력"}
입력 생년월일: ${normalized.inputBirthDate}
정규화된 음력 생년월일: ${normalized.lunarDate}
정규화된 양력 생년월일: ${normalized.solarDate}
출생시간: ${normalized.birthTime || "모름"}
연지·월지·일지·시지: ${normalized.yearBranch} / ${normalized.monthBranch || "미산출"} / ${normalized.dayBranch || "미산출"} / ${normalized.timeBranch || "미산출"}
초년 12성: ${result.stages.early.starName}
청년 12성: ${result.stages.youth.starName}
중년 12성: ${result.stages.middle.starName}
말년 12성: ${result.stages.later.starName}
핵심 성향 요약: ${result.corePattern}
주의 키워드: ${formatList(result.cautionKeywords)}
활용 조언: 줄일 행동(${formatList(result.actionAdvice.reduce)}) / 늘릴 행동(${formatList(result.actionAdvice.increase)})

당신은 당사주와 한국 민간 운세 리딩에 능숙한 전문 상담가입니다.

아래 정보는 사용자의 생년월일시를 내부 사주 엔진으로 정규화한 뒤, 서비스 내부 당사주 12성 기준으로 계산한 결과입니다. 단순히 좋고 나쁨을 말하지 말고, 초년·청년·중년·말년의 흐름과 현재 질문을 연결해 현실적인 조언을 작성해 주세요.

[입력 정보]
선택 메뉴: ${result.modeLabel}
이름 또는 별칭: ${normalized.name || "미입력"}
성별: ${normalized.gender || "선택 안 함"}
입력 생년월일: ${normalized.inputBirthDate}
달력 기준: ${normalized.inputCalendarType}
출생시간: ${normalized.birthTime || "모름"}
질문: ${result.question}
기준 날짜: ${result.baseDate}

[내부 사주 엔진 정규화 정보]
양력 생년월일: ${normalized.solarDate}
음력 생년월일: ${normalized.lunarDate}
윤달 여부: ${normalized.isLeapMonth ? "예" : "아니오"}
연지: ${normalized.yearBranch}
월지: ${normalized.monthBranch || "미산출"}
일지: ${normalized.dayBranch || "미산출"}
시지: ${normalized.timeBranch || "미산출"}
사주 원국: ${formatPillars(normalized)}
계산 신뢰도: ${normalized.confidence}
주의 사항: ${formatList([...normalized.warnings, ...result.warnings])}

[당사주 12성 계산 결과]
${buildStageLine(result.stages.early)}
${buildStageLine(result.stages.youth)}
${buildStageLine(result.stages.middle)}
${buildStageLine(result.stages.later)}

핵심 성향 요약: ${result.corePattern}
강점 키워드: ${formatList(result.strengthKeywords)}
주의 키워드: ${formatList(result.cautionKeywords)}

[해석 요청]
1. 전체 흐름 요약
2. 초년 흐름
3. 청년 흐름
4. 중년 흐름
5. 말년 흐름
6. 현재 질문과의 연결
7. 직업/재물, 관계/가족, 심리/건강, 선택 습관별 현실 조언
8. 핵심 메시지를 5문장 이내로 정리하고 바로 실행할 수 있는 한 문장 조언을 주세요.

[문체 조건]
- 지나치게 공포스럽거나 단정적인 예언처럼 쓰지 마세요.
- 전문 용어는 쉬운 설명을 붙여 주세요.
- 전통적인 상징과 현실적인 조언을 함께 제시해 주세요.
- 재미와 참고 목적의 운세 리딩임을 자연스럽게 안내해 주세요.`;
}

function personSummary(label: string, chart: DangsajuChartResult) {
  const normalized = chart.normalizedBirth;
  return `[${label} 정보]
이름 또는 별칭: ${normalized.name || "미입력"}
입력 생년월일: ${normalized.inputBirthDate}
달력 기준: ${normalized.inputCalendarType}
출생시간: ${normalized.birthTime || "모름"}
양력 생년월일: ${normalized.solarDate}
음력 생년월일: ${normalized.lunarDate}
연지·월지·일지·시지: ${normalized.yearBranch} / ${normalized.monthBranch || "미산출"} / ${normalized.dayBranch || "미산출"} / ${normalized.timeBranch || "미산출"}
사주 원국: ${formatPillars(normalized)}

[${label} 당사주 12성]
초년: ${chart.stages.early.starName}
청년: ${chart.stages.youth.starName}
중년: ${chart.stages.middle.starName}
말년: ${chart.stages.later.starName}`;
}

function buildDangsajuCompatibilityPrompt(result: DangsajuCompatibilityResult) {
  return `[당사주 궁합 계산 요약]
선택 메뉴: ${result.modeLabel}
관계 유형: ${result.relationshipType}
관계 질문: ${result.question}
A 초년·청년·중년·말년: ${result.personA.stages.early.starName} / ${result.personA.stages.youth.starName} / ${result.personA.stages.middle.starName} / ${result.personA.stages.later.starName}
B 초년·청년·중년·말년: ${result.personB.stages.early.starName} / ${result.personB.stages.youth.starName} / ${result.personB.stages.middle.starName} / ${result.personB.stages.later.starName}
조화 포인트: ${formatList(result.harmonyPoints)}
충돌 포인트: ${formatList(result.conflictPoints)}
관계 핵심 요약: ${result.compatibilitySummary}

당신은 당사주와 한국 민간 운세 궁합 리딩에 능숙한 전문 상담가입니다.

아래 정보는 두 사람의 생년월일시를 내부 사주 엔진으로 정규화한 뒤, 서비스 내부 당사주 12성 기준으로 계산한 결과입니다. 두 사람의 초년·청년·중년·말년 흐름을 비교해 관계의 조화와 충돌 포인트를 현실적으로 설명해 주세요.

[관계 입력 정보]
관계 유형: ${result.relationshipType}
관계 질문: ${result.question}
기준 날짜: ${result.baseDate}

${personSummary("A", result.personA)}

${personSummary("B", result.personB)}

[궁합 계산 요약]
조화 포인트: ${formatList(result.harmonyPoints)}
충돌 포인트: ${formatList(result.conflictPoints)}
관계 핵심 요약: ${result.compatibilitySummary}

[해석 요청]
1. 두 사람의 기본 흐름 비교
2. 관계에서 잘 맞는 부분
3. 관계에서 부딪히는 부분
4. 관계 유형에 맞춘 현실 조언
5. A가 줄여야 할 행동 3가지와 늘려야 할 행동 3가지
6. B가 줄여야 할 행동 3가지와 늘려야 할 행동 3가지
7. 대화, 갈등 해결, 돈과 생활 문제, 장기적 신뢰 관리 조언
8. 최종 궁합 요약

[문체 조건]
- 겁을 주거나 이별을 단정하지 마세요.
- 궁합이 나쁘다고 단정하지 말고 조정 포인트를 제시하세요.
- 전문 용어는 쉬운 설명을 붙여 주세요.
- 재미와 참고 목적의 운세 리딩임을 자연스럽게 안내해 주세요.`;
}
