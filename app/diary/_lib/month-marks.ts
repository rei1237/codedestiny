/**
 * 달력 칸에 얹는 지표 3종. 🔴 **색이 아니라 글리프**로 구분한다 — 등급 점은 명도 사다리라
 * 흑백에서도 순서로 읽히고, 지표까지 색으로 나누면 색각 이상에서 둘 다 사라진다(목업 승인본).
 *
 * 🔴 저장소를 다시 열지 않는다 — 이미 하이드레이션된 v2 평면 맵을 그대로 읽는다
 * (계약 정본은 `lib/diary/diary-store.js`, 리더는 `./today-snapshot` 하나다).
 *
 * 필드 대응(셸 모달과 공유하는 v2 필드): 기록 = `nightLog`/`practiceNote`/`memoNote`,
 * 완료 = `challenges[]`(그날 완료한 실천 id), 오늘의 나 = `iAmCompleted`.
 */

import type { DiaryLegacyEntry, DiaryLegacyStore } from "./today-snapshot";
import { readStoredEntry } from "./today-snapshot";

export interface DiaryDayMarks {
  /** ✎ 그날 남긴 글이 있다. */
  note: boolean;
  /** ✓ 그날 완료한 실천이 있다. */
  done: boolean;
  /** ★ 그날의 「오늘의 나」를 마쳤다. */
  iam: boolean;
}

export interface DiaryMonthMarks {
  byYmd: Record<string, DiaryDayMarks>;
  /** 그 달에 기록이 남은 날 수. */
  noteDays: number;
  /** 그 달에 완료한 실천 총 개수. */
  doneCount: number;
}

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export function readDayMarks(entry: DiaryLegacyEntry | null): DiaryDayMarks {
  return {
    note: hasText(entry?.nightLog) || hasText(entry?.practiceNote) || hasText(entry?.memoNote),
    done: Array.isArray(entry?.challenges) && entry.challenges.length > 0,
    iam: entry?.iAmCompleted === true,
  };
}

/** 그 달 날짜들의 마크를 한 번에 모은다. 기록이 하나도 없는 날은 맵에 넣지 않는다. */
export function readMonthMarks(store: DiaryLegacyStore, ymds: string[]): DiaryMonthMarks {
  const byYmd: Record<string, DiaryDayMarks> = {};
  let noteDays = 0;
  let doneCount = 0;

  for (const ymd of ymds) {
    const entry = readStoredEntry(store, ymd);
    if (!entry) continue;
    const marks = readDayMarks(entry);
    if (marks.note) noteDays += 1;
    if (Array.isArray(entry.challenges)) doneCount += entry.challenges.length;
    if (marks.note || marks.done || marks.iam) byYmd[ymd] = marks;
  }

  return { byYmd, noteDays, doneCount };
}
