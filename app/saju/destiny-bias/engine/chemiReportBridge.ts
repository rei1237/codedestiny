// 최애운명 리포트 브리지 — 새 결정론 엔진(lib/idol-chemi: 9유형·근거 신호)과
// 기존 클라이언트 엔진(analyzeDestinyBias: 총점·세부 점수·등급·팬덤 리포트·밈 레이어)을 한 객체로 묶는다.
// 🔴 개인정보: 반환값 어디에도 생년월일을 싣지 않는다. 일련번호 해시에도 생일을 넣지 않는다.
import { runChemi, type CalendarType, type ChemiCopy, type ChemiPartnerRecord, type ChemiResult } from "@/lib/idol-chemi";
import { buildSajuProfile } from "@/worker/lib/destiny-bias-engine.js";
import { analyzeDestinyBias } from "./destinyBiasEngine";
import { buildFavoriteDestinyFromSaju } from "./favoriteDestinyReading";
import { normalizeBirthDateInput } from "./birthEnergy";
import type { DestinyBiasResultViewModel } from "../lib/types";

export const BIAS_MOODS = ["청량", "카리스마", "몽환", "러블리", "시크", "힐링"] as const;
export const RELATION_MOODS = ["응원형", "성장형", "설렘형", "위로형", "운명형"] as const;
/** 미성년 모드에서는 관계 무드 「설렘형」을 고를 수 없고 「찐팬형」으로 보인다. */
export const RELATION_MOODS_MINOR = ["응원형", "성장형", "찐팬형", "위로형", "운명형"] as const;
export const DEFAULT_BIAS_MOOD = "청량";
export const DEFAULT_RELATION_MOOD = "응원형";

export type ChemiSubScoreKey = "emotion" | "excitement" | "stability" | "fanBias" | "longTerm" | "communication";
export type ChemiSubScore = { key: ChemiSubScoreKey; label: string; value: number };

export type ChemiReport = {
  result: ChemiResult;
  copy: ChemiCopy;
  /** 기존 리포트 컴포넌트(Bias*)가 그대로 받는 뷰모델. 생일 필드는 항상 빈 문자열. */
  vm: DestinyBiasResultViewModel;
  totalScore: number;
  subScores: ChemiSubScore[];
  grade: string;
  gradeTitle: string;
  serial: string;
  issuedAt: string;
  minorMode: boolean;
};

export type ChemiReportInput = {
  user: { birthDate: string; calendarType: CalendarType; nickname?: string };
  partner: ChemiPartnerRecord;
  moods?: { biasMood?: string; relationMood?: string };
  themeKey?: string;
  themeLabel?: string;
  /** YYYY-MM-DD (KST). 브리지는 시계를 읽지 않는다. */
  referenceDate: string;
};

const SUB_SCORE_LABELS: Record<ChemiSubScoreKey, { adult: string; minor: string }> = {
  emotion: { adult: "감정 교감", minor: "마음 교감" },
  excitement: { adult: "설렘 지수", minor: "텐션 지수" },
  stability: { adult: "안정감", minor: "안정감" },
  fanBias: { adult: "덕심 화력", minor: "덕심 화력" },
  longTerm: { adult: "장기 서사", minor: "장기 서사" },
  communication: { adult: "티키타카", minor: "티키타카" },
};

// 미성년 모드 치환표. 금지 어휘는 __tests__/worker/idol-chemi-copy.test.js 의 ROMANCE_WORDS 와 같다.
// 긴 낱말을 먼저 바꾼다(「연애」가 「연애운」보다 먼저 먹지 않게 순서 고정).
const MINOR_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["썸네일", "섬네일"],
  ["스킨십", "하이터치"],
  ["로맨스", "우정 서사"],
  ["데이트", "덕질 타임"],
  ["연애", "팀플"],
  ["사랑", "응원"],
  ["설렘", "신남"],
  ["심쿵", "감탄"],
  ["커플", "콤비"],
  ["키스", "하이파이브"],
  ["고백", "응원 한마디"],
  ["애인", "단짝"],
  ["연인", "단짝"],
  ["달달", "훈훈"],
  ["밀당", "티키타카"],
  ["썸", "케미"],
];
export const MINOR_BANNED_WORDS = MINOR_REPLACEMENTS.slice(1).map(([word]) => word);

export function toMinorSafeText(text: string): string {
  let next = String(text ?? "");
  for (const [from, to] of MINOR_REPLACEMENTS) next = next.split(from).join(to);
  return next;
}

function mapStrings<T>(value: T, fn: (text: string) => string): T {
  if (typeof value === "string") return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = mapStrings(item, fn);
    return out as T;
  }
  return value;
}

function fnv1a(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0");
}

/** 달력 정규화(음력→양력)는 검증된 워커 명식 엔진에 맡긴다. 결과는 이 모듈 밖으로 나가지 않는다. */
function toSolarDate(birthDate: string, calendarType: CalendarType): string {
  if (calendarType === "solar") return birthDate;
  const profile = buildSajuProfile({
    name: "",
    gender: "unknown",
    birth: { birthDate, calendarType, isLeapMonth: calendarType === "lunar_leap", birthTimeKnown: false },
  });
  const solar = normalizeBirthDateInput(String(profile?.calendar?.solarDate || ""));
  if (!solar.ok) throw new Error("IDOL_CHEMI_BIRTH_DATE_INVALID");
  return solar.value;
}

export function buildChemiReport(input: ChemiReportInput): ChemiReport {
  const { partner, referenceDate } = input;
  const { result, copy } = runChemi({
    user: {
      birthDate: input.user.birthDate,
      calendarType: input.user.calendarType,
      isLeapMonth: input.user.calendarType === "lunar_leap",
    },
    partner: { kind: partner.kind, id: partner.id },
    referenceDate,
  });
  const minorMode = result.minorMode;
  const biasMood = (BIAS_MOODS as readonly string[]).includes(input.moods?.biasMood || "") ? String(input.moods?.biasMood) : DEFAULT_BIAS_MOOD;
  const rawRelation = String(input.moods?.relationMood || "");
  const relationPool: readonly string[] = minorMode ? RELATION_MOODS_MINOR : RELATION_MOODS;
  const relationMood = relationPool.includes(rawRelation) ? rawRelation : DEFAULT_RELATION_MOOD;
  const userName = String(input.user.nickname || "").trim().slice(0, 12) || "나";
  const userSolar = toSolarDate(input.user.birthDate, input.user.calendarType);

  const legacy = analyzeDestinyBias({
    userName,
    userBirthDateInput: userSolar,
    biasName: partner.displayName,
    biasBirthDateInput: partner.birthDate,
    linkedArtistName: partner.groupLabel,
    biasMood,
    relationMood,
    themeKey: input.themeKey,
    themeLabel: input.themeLabel || "",
  });
  const userBirth = normalizeBirthDateInput(userSolar);
  const partnerBirth = normalizeBirthDateInput(partner.birthDate);
  if (!userBirth.ok || !partnerBirth.ok) throw new Error("IDOL_CHEMI_BIRTH_DATE_INVALID");
  const reading = buildFavoriteDestinyFromSaju(
    { name: userName, birthDate: userBirth.value },
    { name: partner.displayName, birthDate: partnerBirth.value },
  );

  const issuedAt = referenceDate.split("-").join(".");
  const serial = `CD-${fnv1a([partner.kind, partner.id, result.chemiTypeId, legacy.totalScore, referenceDate, biasMood, relationMood].join("|"))}`;

  let vm: DestinyBiasResultViewModel = {
    ...legacy,
    // 생일·생일 기반 해시·생일이 들어간 SVG 는 뷰모델에서 지운다.
    userBirthDate: "",
    biasBirthDate: "",
    destinyId: serial,
    issuedAt,
    cardSvg: "",
    themeLabel: input.themeLabel || "",
    biasMood,
    relationMood,
  };
  if (minorMode) vm = mapStrings(vm, toMinorSafeText);

  const order: ChemiSubScoreKey[] = ["emotion", "excitement", "stability", "fanBias", "longTerm", "communication"];
  const subScores = order.map((key) => ({
    key,
    label: SUB_SCORE_LABELS[key][minorMode ? "minor" : "adult"],
    value: Math.round(reading.scores[key]),
  }));

  return {
    result,
    copy,
    vm,
    totalScore: Math.round(legacy.totalScore),
    subScores,
    grade: legacy.destinyGrade,
    gradeTitle: legacy.gradeTitle,
    serial,
    issuedAt,
    minorMode,
  };
}
