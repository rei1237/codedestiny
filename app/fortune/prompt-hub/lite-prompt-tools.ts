import { lunarToSolar, solarToLunar } from "@/lib/korean-calendar";
import { calculateLocalSaju } from "../../saju/animal-destiny/engine/localSajuCalculator";

export type LitePromptMode = "saju" | "vedic" | "astrology" | "sukuyo";
export type LiteCalendarType = "solar" | "lunar" | "lunarLeap";

export type LitePromptInput = {
  mode: LitePromptMode;
  name?: string;
  gender?: string;
  birthDate: string;
  calendarType: LiteCalendarType;
  birthTime: string;
  timeUnknown: boolean;
  question: string;
  tone: string;
  birthPlace?: string;
  timezone?: string;
  knownChartFacts?: string;
};

export type LitePromptResult = {
  mode: LitePromptMode;
  modeLabel: string;
  input: LitePromptInput;
  normalized: {
    solarDate: string;
    lunarDate: string;
    isLeapMonth: boolean;
    birthTime: string;
    timezone: string;
    warnings: string[];
  };
  summaryCards: Array<{ label: string; value: string }>;
  prompt: string;
};

const LITE_PROMPT_TOOLS_TEXT_TRANSLATIONS = {
  ko: {
    "litePrompt.001": "간단한 사주 프롬프트",
    "litePrompt.002": "사주 원국의 기본 단서를 정리해 질문에 맞는 리딩 프롬프트를 만듭니다.",
    "litePrompt.003": "간단한 베다점 프롬프트",
    "litePrompt.004": "출생 정보와 알고 있는 차트 단서를 정리하고, 미산출 항목은 계산 필요로 남깁니다.",
    "litePrompt.005": "간단한 점성술 프롬프트",
    "litePrompt.006": "태양궁 중심의 가벼운 서양 점성술 리딩 프롬프트를 만듭니다.",
    "litePrompt.007": "간단한 숙요점 프롬프트",
    "litePrompt.008": "음력 월일 기반 본명숙을 산출해 기본 성향 프롬프트를 만듭니다.",
    "litePrompt.009": "양력",
    "litePrompt.010": "연주",
    "litePrompt.011": "월주",
    "litePrompt.012": "일주",
    "litePrompt.013": "시주",
    "litePrompt.014": "본명숙",
    "litePrompt.015": "음력 월일",
    "litePrompt.016": "산출 범위",
    "litePrompt.017": "태양궁",
    "litePrompt.018": "태양궁 키워드",
    "litePrompt.019": "달궁/상승궁",
    "litePrompt.020": "라그나",
    "litePrompt.021": "나크샤트라",
    "litePrompt.022": "다샤",
  },
} as const;

function litePromptToolsText(key: keyof typeof LITE_PROMPT_TOOLS_TEXT_TRANSLATIONS.ko) {
  return LITE_PROMPT_TOOLS_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export const LITE_PROMPT_MODES = [
  { id: "saju", label: litePromptToolsText("litePrompt.001"), description: litePromptToolsText("litePrompt.002") },
  { id: "vedic", label: litePromptToolsText("litePrompt.003"), description: litePromptToolsText("litePrompt.004") },
  { id: "astrology", label: litePromptToolsText("litePrompt.005"), description: litePromptToolsText("litePrompt.006") },
  { id: "sukuyo", label: litePromptToolsText("litePrompt.007"), description: litePromptToolsText("litePrompt.008") },
] as const;

const SUKUYO_MONTH_START = [11, 13, 15, 17, 19, 21, 24, 0, 2, 4, 6, 8];
const SUKUYO_MANSIONS = [
  "각宿", "항宿", "저宿", "방宿", "심宿", "미宿", "기宿", "두宿", "우宿",
  "여宿", "허宿", "위宿", "실宿", "벽宿", "규宿", "루宿", "위宿", "묘宿",
  "필宿", "자宿", "삼宿", "정宿", "귀宿", "류宿", "성宿", "장宿", "익宿",
];

const SOLAR_SIGNS = [
  { sign: "염소자리", start: [12, 22], end: [1, 19] },
  { sign: "물병자리", start: [1, 20], end: [2, 18] },
  { sign: "물고기자리", start: [2, 19], end: [3, 20] },
  { sign: "양자리", start: [3, 21], end: [4, 19] },
  { sign: "황소자리", start: [4, 20], end: [5, 20] },
  { sign: "쌍둥이자리", start: [5, 21], end: [6, 21] },
  { sign: "게자리", start: [6, 22], end: [7, 22] },
  { sign: "사자자리", start: [7, 23], end: [8, 22] },
  { sign: "처녀자리", start: [8, 23], end: [9, 22] },
  { sign: "천칭자리", start: [9, 23], end: [10, 23] },
  { sign: "전갈자리", start: [10, 24], end: [11, 22] },
  { sign: "사수자리", start: [11, 23], end: [12, 21] },
];

const SOLAR_SIGN_KEYWORDS: Record<string, string> = {
  양자리: "시작, 돌파, 즉각적인 결단",
  황소자리: "안정, 감각, 현실 기반",
  쌍둥이자리: "소통, 호기심, 정보 흐름",
  게자리: "보호, 정서, 가족적 안전감",
  사자자리: "표현, 자존감, 창조성",
  처녀자리: "정리, 분석, 실용성",
  천칭자리: "균형, 관계, 합의",
  전갈자리: "집중, 재생, 깊은 감정",
  사수자리: "확장, 철학, 이동",
  염소자리: "책임, 구조, 장기 목표",
  물병자리: "독립, 혁신, 거리감",
  물고기자리: "공감, 상상, 영감",
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number) {
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
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error("생년월일을 다시 확인해주세요.");
  return { year, month, day };
}

function parseBirthTime(value: string, timeUnknown: boolean) {
  if (timeUnknown) return { hour: 12, minute: 0, hasTime: false, text: "모름" };
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) throw new Error("출생시간은 HH:mm 형식으로 입력하거나 모름을 선택해주세요.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("출생시간 범위를 다시 확인해주세요.");
  return { hour, minute, hasTime: true, text: `${pad2(hour)}:${pad2(minute)}` };
}

function calendarForEngine(value: LiteCalendarType) {
  return value === "solar"
    ? { calendarType: "solar" as const, lunarLeap: false, label: litePromptToolsText("litePrompt.009") }
    : { calendarType: "lunar" as const, lunarLeap: value === "lunarLeap", label: value === "lunarLeap" ? "음력 윤달" : "음력" };
}

function solarFromInput(date: { year: number; month: number; day: number }, calendarType: LiteCalendarType) {
  if (calendarType === "solar") return date;
  // 🔴 두 방향 모두 한국 음양력 코어가 한다. 중국 음력은 삭이 CST 23시대에 들면 그 달 전체가
  //    하루 밀린다 — 실측 2026-08-27: 양력→음력 3.67% · 음력→양력 3.68%.
  const solar = lunarToSolar(date.year, Math.abs(date.month), date.day, calendarType === "lunarLeap");
  if (!solar) throw new RangeError("음력 생년월일을 양력으로 옮기지 못했습니다(지원 1900~2100).");
  return { year: solar.year, month: solar.month, day: solar.day };
}

// 생시는 음력일을 바꾸지 않으므로 코어는 날짜만 받는다.
function lunarFromSolar(date: { year: number; month: number; day: number }) {
  const lunar = solarToLunar(date.year, date.month, date.day);
  if (!lunar) throw new RangeError("양력 생년월일을 음력으로 옮기지 못했습니다(지원 1900~2100).");
  return {
    year: lunar.lunarYear,
    month: lunar.lunarMonth,
    day: lunar.lunarDay,
    isLeapMonth: lunar.isLeapMonth,
  };
}

function findSolarSign(month: number, day: number) {
  const value = month * 100 + day;
  const capricorn = month === 12 && day >= 22 || month === 1 && day <= 19;
  if (capricorn) return "염소자리";
  const match = SOLAR_SIGNS.find((item) => {
    const start = item.start[0] * 100 + item.start[1];
    const end = item.end[0] * 100 + item.end[1];
    if (start > end) return false;
    return value >= start && value <= end;
  });
  return match?.sign || "계산 필요";
}

function buildSukuyo(lunarMonth: number, lunarDay: number) {
  const start = SUKUYO_MONTH_START[Math.max(1, Math.min(12, lunarMonth)) - 1] ?? 11;
  const index = (start + Math.max(1, Math.min(30, lunarDay)) - 1) % 27;
  return { index, mansion: SUKUYO_MANSIONS[index] || "미산출" };
}

function normalizeLiteInput(input: LitePromptInput) {
  const birth = parseBirthDate(input.birthDate);
  const time = parseBirthTime(input.birthTime, input.timeUnknown);
  const calendar = calendarForEngine(input.calendarType);
  const solar = solarFromInput(birth, input.calendarType);
  const lunar = lunarFromSolar(solar);
  const warnings = input.timeUnknown ? ["출생시간 미상으로 시간 기반 산출값은 제한됩니다."] : [];
  return {
    birth,
    time,
    calendar,
    solar,
    lunar,
    normalized: {
      solarDate: formatDate(solar.year, solar.month, solar.day),
      lunarDate: formatDate(lunar.year, lunar.month, lunar.day),
      isLeapMonth: lunar.isLeapMonth,
      birthTime: time.text,
      timezone: input.timezone || "Asia/Seoul",
      warnings,
    },
  };
}

function list(values: string[]) {
  return values.filter(Boolean).join(", ") || "미산출";
}

export function getLiteQuestionNotice(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const questionMarks = (trimmed.match(/[?？]/g) || []).length;
  if (questionMarks > 1 || /\b(그리고|또|동시에|둘 다|여러 가지|각각)\b/u.test(trimmed)) {
    return "무료 기본 프롬프트는 하나의 질문을 중심으로 잡을 때 더 안정적입니다.";
  }
  return "";
}

export function buildLiteFortunePrompt(input: LitePromptInput): LitePromptResult {
  if (!input.question.trim()) throw new Error("질문 또는 리딩 목적을 입력해주세요.");
  if (input.mode === "saju") return calculateLiteSajuPrompt(input);
  if (input.mode === "sukuyo") return calculateLiteSukuyoPrompt(input);
  if (input.mode === "astrology") return calculateLiteAstrologyPrompt(input);
  return calculateLiteVedicPrompt(input);
}

export function calculateLiteSajuPrompt(input: LitePromptInput): LitePromptResult {
  const data = normalizeLiteInput(input);
  const local = calculateLocalSaju({
    year: data.birth.year,
    month: data.birth.month,
    day: data.birth.day,
    hour: data.time.hasTime ? data.time.hour : undefined,
    minute: data.time.hasTime ? data.time.minute : undefined,
    hasTime: data.time.hasTime,
    calendarType: data.calendar.calendarType,
    lunarLeap: data.calendar.lunarLeap,
    timezone: data.normalized.timezone,
    gender: input.gender === "남성" ? "male" : input.gender === "여성" ? "female" : "unknown",
  });
  const pillars = {
    year: local.pillars.year.ganji,
    month: local.pillars.month.ganji,
    day: local.pillars.day.ganji,
    hour: local.pillars.hour?.ganji || "출생시간 미상",
  };
  const cards = [
    { label: litePromptToolsText("litePrompt.010"), value: pillars.year },
    { label: litePromptToolsText("litePrompt.011"), value: pillars.month },
    { label: litePromptToolsText("litePrompt.012"), value: pillars.day },
    { label: litePromptToolsText("litePrompt.013"), value: pillars.hour },
  ];
  const prompt = `당신은 사주 명리 상담에 능숙한 전문 상담가입니다.

아래 정보는 내부 사주 엔진으로 생년월일시를 정규화해 만든 무료 간이 사주 프롬프트입니다. 정식 사주 리포트보다 산출 범위가 제한되므로, 원국의 기본 단서와 질문의 현실 조언 중심으로 읽어주세요.

[입력 정보]
이름 또는 별칭: ${input.name || "미입력"}
성별: ${input.gender || "선택 안 함"}
입력 생년월일: ${input.birthDate}
달력 기준: ${data.calendar.label}
출생시간: ${data.normalized.birthTime}
질문: ${input.question}

[내부 사주 엔진 정규화 정보]
양력 생년월일: ${data.normalized.solarDate}
음력 생년월일: ${data.normalized.lunarDate}
윤달 여부: ${data.normalized.isLeapMonth ? "예" : "아니오"}
사주 원국: 연주 ${pillars.year} / 월주 ${pillars.month} / 일주 ${pillars.day} / 시주 ${pillars.hour}
월지: ${local.pillars.month.branch}
일간: ${local.dayStem}
주의 사항: ${list(data.normalized.warnings)}

[해석 요청]
1. 원국의 첫인상을 짧게 정리해 주세요.
2. 월지와 일간을 중심으로 현재 질문을 해석해 주세요.
3. 오행과 십성의 정밀 판단은 계산 필요 항목으로 남기고 단정하지 마세요.
4. 지금 줄일 행동 3가지와 늘릴 행동 3가지를 제안해 주세요.
5. 재미와 참고 목적의 리딩임을 자연스럽게 안내해 주세요.

문체는 ${input.tone || "차분한 상담"} 톤으로 작성해 주세요.`;
  return { mode: "saju", modeLabel: "간단한 사주 프롬프트", input, normalized: data.normalized, summaryCards: cards, prompt };
}

export function calculateLiteSukuyoPrompt(input: LitePromptInput): LitePromptResult {
  const data = normalizeLiteInput(input);
  const sukuyo = buildSukuyo(data.lunar.month, data.lunar.day);
  const cards = [
    { label: litePromptToolsText("litePrompt.014"), value: sukuyo.mansion },
    { label: litePromptToolsText("litePrompt.015"), value: `${data.lunar.month}월 ${data.lunar.day}일` },
    { label: litePromptToolsText("litePrompt.016"), value: "본명숙 중심" },
  ];
  const prompt = `당신은 숙요점 상담에 능숙한 전문 상담가입니다.

아래 정보는 정규화된 음력 월일을 바탕으로 본명숙만 산출한 무료 간이 숙요점 프롬프트입니다. 정식 숙요 궁합 리포트처럼 관계 거리, 궁합 지수, 장문 챕터를 만들지 말고 본명숙의 기본 성향과 질문의 흐름을 중심으로 읽어주세요.

[입력 정보]
이름 또는 별칭: ${input.name || "미입력"}
생년월일: ${input.birthDate}
달력 기준: ${data.calendar.label}
출생시간: ${data.normalized.birthTime}
질문: ${input.question}

[숙요점 간이 산출값]
양력 생년월일: ${data.normalized.solarDate}
음력 생년월일: ${data.normalized.lunarDate}
윤달 여부: ${data.normalized.isLeapMonth ? "예" : "아니오"}
본명숙: ${sukuyo.mansion}
산출 기준: 음력 월일 기반 본명숙 간이 계산

[해석 요청]
1. 본명숙이 보여주는 기본 기질을 설명해 주세요.
2. 질문과 연결되는 관계, 일, 선택 습관을 현실적으로 짚어 주세요.
3. 정식 궁합 거리나 상대 숙 계산은 계산 필요로 남겨 주세요.
4. 지금 확인해야 할 체크포인트 3가지를 제안해 주세요.
5. 재미와 참고 목적의 리딩임을 자연스럽게 안내해 주세요.

문체는 ${input.tone || "차분한 상담"} 톤으로 작성해 주세요.`;
  return { mode: "sukuyo", modeLabel: "간단한 숙요점 프롬프트", input, normalized: data.normalized, summaryCards: cards, prompt };
}

export function calculateLiteAstrologyPrompt(input: LitePromptInput): LitePromptResult {
  const data = normalizeLiteInput(input);
  const sunSign = findSolarSign(data.solar.month, data.solar.day);
  const cards = [
    { label: litePromptToolsText("litePrompt.017"), value: sunSign },
    { label: litePromptToolsText("litePrompt.018"), value: SOLAR_SIGN_KEYWORDS[sunSign] || "계산 필요" },
    { label: litePromptToolsText("litePrompt.019"), value: "계산 필요" },
  ];
  const prompt = `당신은 서양 점성술 상담에 능숙한 전문 상담가입니다.

아래 정보는 양력 생년월일로 태양궁만 산출한 무료 간이 점성술 프롬프트입니다. 정식 점성술 리포트처럼 달궁, 상승궁, 하우스, 행성 각도를 임의로 만들지 말고, 없는 항목은 계산 필요로 남겨 주세요.

[입력 정보]
이름 또는 별칭: ${input.name || "미입력"}
생년월일: ${input.birthDate}
달력 기준: ${data.calendar.label}
출생시간: ${data.normalized.birthTime}
출생지: ${input.birthPlace || "미입력"}
시간대: ${data.normalized.timezone}
질문: ${input.question}

[점성술 간이 산출값]
양력 생년월일: ${data.normalized.solarDate}
태양궁: ${sunSign}
태양궁 키워드: ${SOLAR_SIGN_KEYWORDS[sunSign] || "계산 필요"}
달궁: 계산 필요
상승궁: 계산 필요
하우스/행성각: 계산 필요

[해석 요청]
1. 태양궁 중심의 기본 방향을 설명해 주세요.
2. 달궁과 상승궁이 없으므로 감정 패턴과 외적 태도는 단정하지 마세요.
3. 현재 질문을 태양궁의 선택 방식과 연결해 현실 조언으로 풀어 주세요.
4. 정밀 차트 계산이 필요한 항목을 마지막에 정리해 주세요.
5. 재미와 참고 목적의 리딩임을 자연스럽게 안내해 주세요.

문체는 ${input.tone || "차분한 상담"} 톤으로 작성해 주세요.`;
  return { mode: "astrology", modeLabel: "간단한 점성술 프롬프트", input, normalized: data.normalized, summaryCards: cards, prompt };
}

export function calculateLiteVedicPrompt(input: LitePromptInput): LitePromptResult {
  const data = normalizeLiteInput(input);
  const knownFacts = input.knownChartFacts?.trim() || "미입력";
  const cards = [
    { label: litePromptToolsText("litePrompt.020"), value: "계산 필요" },
    { label: litePromptToolsText("litePrompt.021"), value: "계산 필요" },
    { label: litePromptToolsText("litePrompt.022"), value: "계산 필요" },
  ];
  const prompt = `당신은 베다 점성술 상담에 능숙한 전문 상담가입니다.

아래 정보는 출생 정보와 사용자가 이미 알고 있는 차트 단서를 정리한 무료 간이 베다점 프롬프트입니다. 라그나, 나크샤트라, 다샤가 제공되지 않았다면 임의로 만들지 말고 계산 필요로 표시해 주세요. 서양 점성술, 호라리, 프라슈나 기준과 섞지 마세요.

[입력 정보]
이름 또는 별칭: ${input.name || "미입력"}
생년월일: ${input.birthDate}
달력 기준: ${data.calendar.label}
출생시간: ${data.normalized.birthTime}
출생지: ${input.birthPlace || "미입력"}
시간대: ${data.normalized.timezone}
질문: ${input.question}

[베다점 간이 정리]
양력 생년월일: ${data.normalized.solarDate}
음력 생년월일: ${data.normalized.lunarDate}
라그나: 계산 필요
문 사인: 계산 필요
나크샤트라: 계산 필요
현재 다샤: 계산 필요
사용자가 알고 있는 차트 정보: ${knownFacts}

[해석 요청]
1. 제공된 출생 정보와 known chart facts만 사용해 주세요.
2. 라그나, 나크샤트라, 다샤가 없으면 임의 해석하지 말고 필요한 계산값으로 정리해 주세요.
3. 질문을 베다 점성술 상담 흐름에 맞춰 차분히 분석해 주세요.
4. 정밀 베다 차트에서 추가로 확인해야 할 항목 5가지를 제안해 주세요.
5. 재미와 참고 목적의 리딩임을 자연스럽게 안내해 주세요.

문체는 ${input.tone || "차분한 상담"} 톤으로 작성해 주세요.`;
  return { mode: "vedic", modeLabel: "간단한 베다점 프롬프트", input, normalized: data.normalized, summaryCards: cards, prompt };
}
