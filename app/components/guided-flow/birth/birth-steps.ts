// 공용 출생 정보 입력 단계 묶음(W1)의 순수 규칙. 화면은 GuidedBirthSteps.tsx 가 그린다.
// 단계 순서는 고정이다: 이름(선택) → 성별 → 생년월일 → 양력·음력·윤달 → 태어난 시각(몰라요) → 태어난 장소(선택) → 확인 요약.
// 흐름마다 fields 로 필요한 단계만 고른다. 단계 id 는 기존 셸 흐름(A2·A3)의 id(date·calendar·time·gender·name)와 같다.
// 답 형식: name 문자열, gender 'female'|'male'|'unknown', date 'YYYY-MM-DD'(못 읽으면 ''), calendar 'solar'|'lunar'|'leap',
// time 'HH:mm'(모르면 ''), place [입력 글자, 위도, 경도, 시간대, 확인된 이름](비우면 서울 경도 기준 = 지금 동작).
import type { GuidedStep } from "../useGuidedFlow";
import { normalizeBirthDateInput } from "@/lib/birthDateInput";

export type BirthField = "name" | "gender" | "date" | "calendar" | "time" | "place";
export const BIRTH_FIELDS: readonly BirthField[] = ["name", "gender", "date", "calendar", "time", "place"];
export const BIRTH_CONFIRM = "confirm";

export type BirthGender = "female" | "male" | "unknown";
export type BirthCalendar = "solar" | "lunar" | "leap";

export type BirthStepsConfig = {
  fields: readonly BirthField[];
  /** 기본: date·gender·calendar 필수, name·time·place 선택. */
  required?: Partial<Record<BirthField, boolean>>;
  /** 확인 요약 단계(기본 true). */
  confirm?: boolean;
};

const DEFAULT_REQUIRED: Record<BirthField, boolean> = {
  name: false, gender: true, date: true, calendar: true, time: false, place: false,
};
const CHOICE_FIELDS = new Set<BirthField>(["gender", "calendar"]);

export function isBirthField(id: string | null | undefined): id is BirthField {
  return Boolean(id) && (BIRTH_FIELDS as readonly string[]).includes(String(id));
}

/** 설정 → 셸 단계 정의(정해진 순서). 호스트는 뒤에 계산·결과 단계를 이어 붙인다. */
export function birthSteps(config: BirthStepsConfig): GuidedStep[] {
  const wanted = new Set(config.fields);
  const steps: GuidedStep[] = [];
  for (const field of BIRTH_FIELDS) {
    if (!wanted.has(field)) continue;
    const required = config.required?.[field] ?? DEFAULT_REQUIRED[field];
    steps.push({ id: field, kind: CHOICE_FIELDS.has(field) ? "choice" : "input", ...(required ? {} : { required: false }) });
  }
  if (config.confirm !== false) steps.push({ id: BIRTH_CONFIRM, kind: "input", required: false });
  return steps;
}

/* ── 12지 시진 ──
 * 칩은 시진 한가운데 시각(짝수 시 30분)을 넣는다. 23시 기준 경계, 23:30 기준 경계, 서울 진태양시 보정(약 −32분)
 * 어느 쪽으로 계산해도 같은 시지에 들어가는 값이다. 범위 표시는 한국 표준시 관행(30분 경계)을 따른다. */
export type Sijin = { key: string; branch: string; from: string; to: string; value: string };
const BRANCHES: [string, string][] = [
  ["zi", "子"], ["chou", "丑"], ["yin", "寅"], ["mao", "卯"], ["chen", "辰"], ["si", "巳"],
  ["wu", "午"], ["wei", "未"], ["shen", "申"], ["you", "酉"], ["xu", "戌"], ["hai", "亥"],
];
const hhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export const SIJIN: readonly Sijin[] = BRANCHES.map(([key, branch], index) => ({
  key,
  branch,
  from: hhmm(23 * 60 + 30 + index * 120),
  to: hhmm(23 * 60 + 30 + index * 120 + 119),
  value: hhmm(30 + index * 120),
}));

/** 칩이 넣은 값과 같으면 그 시진. 직접 입력한 시각은 칩을 켜지 않는다(정확한 시각이 우선). */
export function sijinForValue(time: string): Sijin | null {
  return SIJIN.find((item) => item.value === time) || null;
}

/* ── 생년월일 세그먼트 ── */
export type DateParts = { year: string; month: string; day: string };

export function splitBirthDate(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? { year: match[1], month: match[2], day: match[3] } : { year: "", month: "", day: "" };
}

/** 세그먼트 → 답. 세 칸이 다 차야 판정한다. 범위는 1900년 ~ 올해(미래 날짜는 받지 않는다). */
export function dateFromParts(parts: DateParts, now: Date = new Date()): { value: string; complete: boolean; invalid: boolean } {
  const complete = parts.year.length === 4 && parts.month.length >= 1 && parts.day.length >= 1;
  if (!complete) return { value: "", complete: false, invalid: false };
  const value = normalizeBirthDateInput(`${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`);
  const year = Number(parts.year);
  const future = value ? value > `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : false;
  const ok = Boolean(value) && year >= 1900 && !future;
  return { value: ok ? value : "", complete: true, invalid: !ok };
}

/* ── 답 읽기 ── */
export type BirthPlace = { text: string; lat: number; lng: number; timezone: string; name: string };
export type BirthAnswers = {
  name: string;
  gender: BirthGender | "";
  date: string;
  calendar: BirthCalendar | "";
  time: string;
  /** 확인된 출생지. 없으면 null(호스트는 지금처럼 서울 경도 기준). */
  place: BirthPlace | null;
  placeText: string;
};

const str = (value: unknown) => (typeof value === "string" ? value : "");

export function readBirthAnswers(answers: Record<string, unknown>): BirthAnswers {
  const gender = str(answers.gender);
  const calendar = str(answers.calendar);
  const place = Array.isArray(answers.place) ? (answers.place as string[]) : [];
  const lat = Number(place[1]);
  const lng = Number(place[2]);
  const resolved = place.length >= 5 && place[1] !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Boolean(place[3]);
  return {
    name: str(answers.name),
    gender: gender === "female" || gender === "male" || gender === "unknown" ? gender : "",
    date: normalizeBirthDateInput(str(answers.date)),
    calendar: calendar === "solar" || calendar === "lunar" || calendar === "leap" ? calendar : "",
    time: /^\d{2}:\d{2}$/.test(str(answers.time)) ? str(answers.time) : "",
    place: resolved ? { text: str(place[0]), lat, lng, timezone: str(place[3]), name: str(place[4]) } : null,
    placeText: str(place[0]),
  };
}

export function placeAnswer(text: string, resolved: Omit<BirthPlace, "text"> | null): string[] {
  if (!text.trim()) return [];
  return resolved
    ? [text, String(resolved.lat), String(resolved.lng), resolved.timezone, resolved.name]
    : [text, "", "", "", ""];
}

/** 저장 프로필(selectedBirthProfileSeed) → 고른 단계의 답. 비어 있는 값은 넣지 않는다. */
export type BirthProfileSeed = {
  name?: string; birthDate?: string; birthTime?: string; birthTimeUnknown?: boolean;
  gender?: string; calendarType?: "solar" | "lunar"; isLeapMonth?: boolean;
};
export function birthAnswersFromSeed(seed: BirthProfileSeed, fields: readonly BirthField[]): Record<string, string> {
  const wanted = new Set(fields);
  const patch: Record<string, string> = {};
  if (wanted.has("name") && seed.name) patch.name = seed.name;
  if (wanted.has("gender") && (seed.gender === "female" || seed.gender === "male")) patch.gender = seed.gender;
  const date = normalizeBirthDateInput(seed.birthDate || "");
  if (wanted.has("date") && date) patch.date = date;
  if (wanted.has("calendar") && seed.calendarType) patch.calendar = seed.calendarType === "lunar" ? (seed.isLeapMonth ? "leap" : "lunar") : "solar";
  if (wanted.has("time")) {
    const time = seed.birthTimeUnknown ? "" : String(seed.birthTime || "");
    patch.time = /^\d{2}:\d{2}$/.test(time) ? time : "";
  }
  return patch;
}

/** 저장 프로필을 고른 뒤 갈 단계: 필수 답이 빠진 첫 출생 단계, 다 있으면 확인 요약(없으면 마지막 출생 단계). */
export function nextBirthStepAfterProfile(steps: readonly GuidedStep[], answers: Record<string, unknown>): string | null {
  for (const step of steps) {
    if (!isBirthField(step.id)) continue;
    if (step.required === false) continue;
    const value = answers[step.id];
    if (typeof value !== "string" || !value.trim()) return step.id;
  }
  if (steps.some((step) => step.id === BIRTH_CONFIRM)) return BIRTH_CONFIRM;
  const last = [...steps].reverse().find((step) => isBirthField(step.id));
  return last ? last.id : null;
}
