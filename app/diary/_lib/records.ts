/**
 * 기록 목록·검색·통계가 읽는 파생값. 🔴 저장소를 열지 않는다 — `DiaryStoreProvider` 가 한 번
 * 하이드레이션한 스냅샷(`store`·`ext`)을 인자로 받는다(원칙 6, 두 번째 리더 금지).
 *
 * 🔴 두 저장 자리를 여기서 **합쳐 읽기만** 한다. v2(셸 공유)와 확장 키는 자리가 그대로 갈려
 * 있고, 이 파일은 어느 필드가 어느 자리에서 왔는지 모른 채 한 줄로 만들지 않는다 —
 * 아래 `DiaryRecordRow` 가 필드별로 나눠 담는 이유다(검색이 어디서 걸렸는지 말해야 한다).
 */

import {
  readExtDay,
  readSchedules,
  readTags,
  readTodos,
  type DiaryExtStore,
} from "./ext-snapshot";
import { parseYmd } from "./kst-date";
import { readAchievement, readStoredEntry, type DiaryLegacyStore } from "./today-snapshot";

/** 하루치를 목록·검색이 쓰는 형태로 편 것. 빈 하루는 여기까지 오지 않는다. */
export interface DiaryRecordRow {
  ymd: string;
  /** 오늘 한 줄. 카드에서 2줄로 자르는 유일한 칸이다. */
  line: string;
  memo: string;
  mood: string;
  tags: string[];
  schedules: string[];
  todos: string[];
  done: number;
  total: number;
  /**
   * 회고 만족도 0~5. 매기지 않은 날은 `null` 이다(`writeRetroRate` 가 같은 값을 다시 누르면
   * 0 으로 지운다 — 통계가 그 0 을 「만족도 0점」으로 세면 평균이 안 매긴 날에 끌려간다).
   */
  rate: number | null;
}

/**
 * 남긴 것이 있는 날만 최신순으로 편다.
 *
 * 🔴 "남긴 것"의 판정이 여기 하나여야 한다 — 달력의 ✎ 표시(`./month-marks`)는 v2 세 칸만
 * 보지만 목록은 확장 기록까지 본다. 두 화면이 다른 것을 세는 것은 의도된 차이이고,
 * 그래서 목록 쪽 기준을 이 함수 밖으로 흘리지 않는다.
 */
export function buildDiaryRecordRows(
  store: DiaryLegacyStore,
  ext: DiaryExtStore,
): DiaryRecordRow[] {
  const ymds = new Set([...Object.keys(store || {}), ...Object.keys(ext || {})]);
  const rows: DiaryRecordRow[] = [];

  for (const ymd of ymds) {
    /* 저장소는 손으로도 고쳐질 수 있다 — 날짜 키가 아닌 것은 목록에 올리지 않는다. */
    if (!parseYmd(ymd)) continue;

    const entry = readStoredEntry(store, ymd);
    const day = readExtDay(ext, ymd);
    const line = String(entry?.practiceNote || entry?.nightLog || "").trim();
    const memo = String(entry?.memoNote || "").trim();
    const mood = String(entry?.moodEmoji || "");
    const tags = readTags(day);
    const schedules = readSchedules(day).map((item) => String(item.text || ""));
    const todos = readTodos(day).map((item) => String(item.text || ""));
    const { done, total } = readAchievement(entry, day);
    const rawRate = Number(entry?.reviewRate);
    const rate = Number.isFinite(rawRate) && rawRate >= 1 && rawRate <= 5 ? rawRate : null;

    if (!line && !memo && !mood && !tags.length && !schedules.length && !todos.length && !total) {
      continue;
    }
    rows.push({ ymd, line, memo, mood, tags, schedules, todos, done, total, rate });
  }

  /* 최신순. 날짜 키가 `YYYY-MM-DD` 라 문자열 비교가 곧 날짜 비교다(Date 를 만들지 않는다). */
  return rows.sort((a, b) => (a.ymd < b.ymd ? 1 : a.ymd > b.ymd ? -1 : 0));
}

/** 태그와 그 태그를 단 날 수. 많이 쓴 것부터, 같으면 가나다순이다. */
export interface DiaryTagCount {
  tag: string;
  count: number;
}

/**
 * 태그를 센다. 🔴 세는 자리는 여기 하나다 — 통계의 태그 순위와 목록의 필터 줄이 각자 세면
 * 같은 태그가 두 화면에서 다른 순서로 앉는다(아래 `collectDiaryTags` 도 이것을 쓴다).
 */
export function collectDiaryTagCounts(rows: DiaryRecordRow[]): DiaryTagCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([tag, count]) => ({ tag, count }));
}

/** 필터 줄에 세울 태그. 순서는 `collectDiaryTagCounts` 와 같다. */
export function collectDiaryTags(rows: DiaryRecordRow[]): string[] {
  return collectDiaryTagCounts(rows).map((item) => item.tag);
}

/** 검색 범위. 🔴 한 번에 하나만 고른다 — 여러 축을 켜면 결과가 어디서 왔는지 읽히지 않는다. */
export type DiarySearchScope = "all" | "note" | "plan" | "tag";

export type DiarySearchField = "line" | "memo" | "schedule" | "todo" | "tag";

export interface DiarySearchHit {
  ymd: string;
  field: DiarySearchField;
  /** 맞은 자리 앞뒤를 자른 조각. `match` 만 화면에서 `mark` 로 감싼다. */
  before: string;
  match: string;
  after: string;
}

/** 이 글자 수부터 찾는다. 한 글자로 찾으면 거의 모든 날이 걸려 결과가 목록과 다를 게 없다. */
export const DIARY_SEARCH_MIN = 2;

/** 한 번에 그리는 결과 상한. 넘는 만큼은 검색어를 좁혀서 보게 한다. */
export const DIARY_SEARCH_MAX = 100;

const SNIPPET_BEFORE = 24;
const SNIPPET_AFTER = 48;

function sliceAround(text: string, index: number, length: number) {
  const start = Math.max(0, index - SNIPPET_BEFORE);
  const end = Math.min(text.length, index + length + SNIPPET_AFTER);
  return {
    before: `${start > 0 ? "…" : ""}${text.slice(start, index)}`,
    match: text.slice(index, index + length),
    after: `${text.slice(index + length, end)}${end < text.length ? "…" : ""}`,
  };
}

/**
 * 기록 안에서 글자를 찾는다. 🔴 대소문자만 접고 그 밖의 정규화는 하지 않는다 —
 * 한글에는 어간 처리가 없고, 어설픈 변형은 사용자가 적은 글자와 결과를 어긋나게 만든다.
 * 🔴 검색어는 어디에도 남기지 않는다(URL·저장소). 이 함수는 인자로만 받는다.
 */
export function searchDiaryRecords(
  rows: DiaryRecordRow[],
  query: string,
  scope: DiarySearchScope,
): DiarySearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < DIARY_SEARCH_MIN) return [];

  const hits: DiarySearchHit[] = [];
  for (const row of rows) {
    const fields: [DiarySearchField, string][] = [];
    if (scope === "all" || scope === "note") {
      fields.push(["line", row.line], ["memo", row.memo]);
    }
    if (scope === "all" || scope === "plan") {
      for (const text of row.todos) fields.push(["todo", text]);
      for (const text of row.schedules) fields.push(["schedule", text]);
    }
    if (scope === "all" || scope === "tag") {
      for (const text of row.tags) fields.push(["tag", text]);
    }

    for (const [field, text] of fields) {
      if (!text) continue;
      const index = text.toLowerCase().indexOf(needle);
      if (index < 0) continue;
      hits.push({ ymd: row.ymd, field, ...sliceAround(text, index, needle.length) });
      if (hits.length >= DIARY_SEARCH_MAX) return hits;
    }
  }
  return hits;
}
