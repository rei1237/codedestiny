/**
 * 엔트리 변경 함수 모음. `useDiaryWriter().updateEntry(ymd, …)` 에 넘기는 것들이다.
 *
 * 🔴 **필드 대응은 셸 모달과 같아야 한다** — 두 표면이 같은 v2 엔트리 하나를 쓰기 때문에,
 * 앱이 셸과 다른 필드에 적으면 사용자가 보기에 기록이 사라진다. 그래서 각 함수에 셸의
 * 대응 위치를 적어 두고, 화면 컴포넌트가 자기 손으로 필드를 정하지 않게 여기 모은다.
 *
 * 🔴 여기 있는 함수는 **자기가 아는 필드만** 건드린다. 엔트리를 새 객체로 갈아끼우면
 * 셸이 나중에 추가할 필드가 그 자리에서 사라진다(저장 계약 주석 `lib/diary/diary-store.js:24`).
 */

import type { DiaryEntryMutate } from "../_components/DiaryStoreProvider";

/**
 * 고를 수 있는 기분. 🔴 셸 `js/luck-sync-diary.js:3850-3855` 와 **같은 6개**여야 한다 —
 * `moodEmoji` 가 공유 필드라, 목록이 갈리면 셸이 저장한 값이 앱에서 선택으로 보이지 않는다.
 */
export const DIARY_MOOD_EMOJIS = ["🔥", "😊", "😌", "😐", "😔", "🥱"] as const;

/** 기분 이모지. 셸 `js/luck-sync-diary.js:4346` 과 같이 값 하나만 바꾼다. */
export function writeMood(emoji: string): DiaryEntryMutate {
  return (entry) => {
    entry.moodEmoji = emoji;
  };
}

/**
 * 오늘 한 줄. 🔴 셸 `:4367-4368` 이 `practiceNote` 와 `nightLog` 를 **함께** 쓰므로 여기서도
 * 같이 쓴다 — 한쪽만 쓰면 셸 화면(`:4209` 는 `practiceNote || nightLog`)과 달력 기록 표시가
 * 서로 다른 값을 보게 된다.
 */
export function writeOneLine(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.practiceNote = text;
    entry.nightLog = text;
  };
}

/** 한 줄 메모. 셸 `:4710` 과 같은 필드다. */
export function writeMemo(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.memoNote = text;
  };
}

/** 루틴 체크. 셸 `:2617-2626` 과 같이 완료 목록에 id 를 넣고 뺀다. */
export function toggleRoutine(id: string): DiaryEntryMutate {
  return (entry) => {
    const done = Array.isArray(entry.challenges) ? entry.challenges : [];
    entry.challenges = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
  };
}

/** 회고 한 줄. 셸은 `ensureEntryShape:615` 로 자리만 만들고 화면에 쓰지 않는다. */
export function writeRetroNote(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.reviewNote = text;
  };
}

/** 회고 만족도 0~5. 같은 값을 다시 누르면 해제한다. */
export function writeRetroRate(rate: number): DiaryEntryMutate {
  return (entry) => {
    entry.reviewRate = entry.reviewRate === rate ? 0 : rate;
  };
}
