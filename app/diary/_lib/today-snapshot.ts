/**
 * 홈 카드군이 읽는 하루치 스냅샷. 🔴 **읽기 전용이다** — 저장은 PR-E 에서 붙는다.
 *
 * 🔴 저장소 접근은 반드시 `lib/diary/diary-store.js` 계약을 거친다. 제 손으로 키를 열면
 * `__tests__/ui/diary-store-roundtrip.test.js` 의 왕복 증명 밖으로 나가고, 그때 갈리는 것은
 * 셸 모달과 공유하는 사용자의 기록이다.
 * 🔴 운기는 `lib/diary/fortune-adapter.ts` 하나만 부른다(동치 3축이 어댑터에만 있다).
 * 🔴 원국 차트는 **하루에 한 번**만 만든다 — 셸이 `_lsdCtx.luckyEl` 을 기준일 일진으로 한 번
 * 계산해 그대로 쓰기 때문이고, 날짜마다 다시 부르면 판정이 갈린다.
 */

import { getDiaryEntry, readDiaryStore } from "@/lib/diary/diary-store";
import {
  buildDiaryNatalChart,
  classifyDiaryDay,
  type DiaryBirthInput,
  type DiaryDayFortune,
  type DiaryNatalChart,
} from "@/lib/diary/fortune-adapter";
import { readTodoProgress, type DiaryExtDay } from "./ext-snapshot";
import { lunarToSolar } from "@/lib/korean-calendar";
import {
  readCurrentDestinyProfile,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "@/app/_lib/profile-card-storage";

/**
 * 홈이 읽는 기존(v2) 엔트리 필드만 추린 것이다. 🔴 저장 계약의 정본은 `diary-store.js` 이고
 * 이 타입은 그 값을 읽기 위한 시야일 뿐이다 — 여기 없는 필드도 저장소에는 그대로 남는다.
 */
export interface DiaryLegacyEntry {
  date?: string;
  /** 그날 완료한 실천 항목의 id 목록. 셸 `:2617` 이 id 를 넣고 뺀다. */
  challenges?: string[];
  /** 그날의 실천 목록. 셸 `:2554` 가 `{id, text}` 로 채운다. */
  challengeCatalog?: { id?: string; text?: string }[];
  challengeTotalToday?: number;
  moodEmoji?: string;
  iAmAffirmation?: string;
  iAmCompleted?: boolean;
  /** 직전에 고른 문장 자리. 같은 문장이 연달아 나오지 않게 하는 것뿐이다(셸 `:2383`). */
  iAmLastIndex?: number;
  /** 장면 그리기. 셸 `:4455-4462` 가 쓰는 것과 같은 네 필드다. */
  satsKeyword?: string;
  satsScene?: string;
  satsSceneLastIndex?: number;
  satsCompleted?: boolean;
  /** 다시 쓰기. 셸 `:4425`·`:4442` 와 같다. */
  revisionOriginal?: string;
  revisionImagined?: string;
  revisionDoneCount?: number;
  /** 실제로 들은 시간(분)과 그 기록. 셸 `:836-838` 이 자리를 만든다. */
  meditationMinutes?: number;
  meditationPoints?: number;
  meditationLogs?: { type?: string; ts?: number; trackId?: string; ok?: boolean }[];
  practiceNote?: string;
  nightLog?: string;
  memoNote?: string;
  /** 회고 한 줄. 셸은 `ensureEntryShape:615` 로 자리만 만들고 화면에 쓰지 않는다. */
  reviewNote?: string;
  /** 회고 만족도 0~5. `reviewNote` 와 같은 자리다. */
  reviewRate?: number;
}

/** 날짜 키 → 엔트리. 셸 모달과 공유하는 v2 평면 맵 그대로다. */
export type DiaryLegacyStore = Record<string, DiaryLegacyEntry>;

export interface DiaryTodaySnapshot {
  ymd: string;
  entry: DiaryLegacyEntry | null;
  /**
   * 저장소 전체(읽기 전용). 🔴 달력·Day View 가 다른 날짜를 볼 때 저장소를 다시 열지 않으려고
   * 하이드레이션 한 번의 결과를 그대로 들고 있는다 — 두 번째 리더를 만들면 그것이 곧
   * 계약 우회 지점이 된다(원칙 6).
   */
  store: DiaryLegacyStore;
  chart: DiaryNatalChart | null;
  fortune: DiaryDayFortune | null;
}

export const EMPTY_DIARY_TODAY_SNAPSHOT: DiaryTodaySnapshot = {
  ymd: "",
  entry: null,
  store: {},
  chart: null,
  fortune: null,
};

/**
 * 활성 프로필 → 어댑터가 받는 양력 생년월일시.
 * 셸 `_activeProfilePillars:465` 와 같은 순서다 — 시가 없으면 12시, 음력이면 양력으로 옮기고
 * 옮기지 못하면 `null`(그 자리에서 원국을 만들지 않는다).
 */
function resolveDiaryBirthInput(profile: DestinyProfileCard | null): DiaryBirthInput | null {
  const parts = resolveDestinyProfileBirthParts(profile);
  if (!parts) return null;

  const birth = profile?.birth || {};
  const calType = String(birth.calType || profile?.calType || profile?.calendarType || "solar").toLowerCase();
  let { year, month, day } = parts;
  if (calType.includes("lunar")) {
    const converted = lunarToSolar(year, month, day, calType.includes("leap"));
    if (!converted) return null;
    year = converted.year;
    month = converted.month;
    day = converted.day;
  }

  const hour = Number(birth.hour ?? profile?.birthHour);
  const minute = Number(birth.minute ?? profile?.birthMinute);
  return {
    year,
    month,
    day,
    hour: Number.isFinite(hour) ? hour : null,
    minute: Number.isFinite(minute) ? minute : null,
  };
}

/** 오늘 하루치를 한 번에 읽는다. 브라우저에서만 부른다(정적 export 는 빌드 때 프리렌더된다). */
export function readDiaryTodaySnapshot(ymd: string): DiaryTodaySnapshot {
  if (typeof window === "undefined") return { ...EMPTY_DIARY_TODAY_SNAPSHOT, ymd };

  let store: DiaryLegacyStore = {};
  let entry: DiaryLegacyEntry | null = null;
  try {
    /* 🔴 읽기만 한다 — `getDiaryEntry` 가 메모리 사본에 빈 엔트리를 꽂아도 저장하지 않는다. */
    store = readDiaryStore(window.localStorage) as DiaryLegacyStore;
    entry = getDiaryEntry(store, ymd) as DiaryLegacyEntry;
  } catch {
    store = {};
    entry = null;
  }

  let chart: DiaryNatalChart | null = null;
  let fortune: DiaryDayFortune | null = null;
  try {
    const birth = resolveDiaryBirthInput(readCurrentDestinyProfile());
    chart = birth ? buildDiaryNatalChart(birth, ymd) : null;
    fortune = classifyDiaryDay(chart, ymd);
  } catch {
    chart = null;
    fortune = null;
  }

  return { ymd, entry, store, chart, fortune };
}

/**
 * 저장소에서 하루치를 **있는 그대로** 꺼낸다. 기록이 없으면 `null` 이다.
 * 🔴 `getDiaryEntry` 를 쓰지 않는 이유는 그쪽이 없는 날에 빈 엔트리를 꽂기 때문이다 —
 * 달력이 스쳐 간 날마다 빈 껍데기가 생기면 "기록이 있는 날" 판정이 통째로 무너진다.
 */
export function readStoredEntry(store: DiaryLegacyStore, ymd: string): DiaryLegacyEntry | null {
  const entry = store?.[ymd];
  return entry && typeof entry === "object" ? entry : null;
}

/**
 * 그날의 성취 — **완료축(할 일) + 연속축(루틴)** 을 합산한다. 루틴 분모는 셸 `:2118` 과 같은
 * 순서로 고른다(`challengeTotalToday` 우선).
 *
 * 🔴 합산 규칙이 여기 하나여야 한다 — 홈 계획 카드의 머리 숫자와 기록 카드의 성취 바가
 * 같은 하루를 다른 숫자로 보여 주면, 사용자는 둘 중 무엇이 오늘인지 알 수 없다.
 * 🔴 일정은 세지 않는다 — 시간이 정해진 것은 완료·미완료로 나뉘는 축이 아니다.
 */
export function readAchievement(
  entry: DiaryLegacyEntry | null,
  extDay: DiaryExtDay | null = null,
): { done: number; total: number } {
  const catalog = Array.isArray(entry?.challengeCatalog) ? entry.challengeCatalog : [];
  const routineDone = Array.isArray(entry?.challenges) ? entry.challenges.length : 0;
  const routineTotal = Number(entry?.challengeTotalToday) || catalog.length;
  const todo = readTodoProgress(extDay);
  return { done: routineDone + todo.done, total: routineTotal + todo.total };
}
