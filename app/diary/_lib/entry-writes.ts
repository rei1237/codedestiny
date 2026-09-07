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
import type { DiaryLegacyEntry } from "./today-snapshot";

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

/* ── 더보기 · 명상 / 마음 훈련 ─────────────────────────────────────────
 * 🔴 아래 다섯 뮤테이터는 전부 v2 공유 필드를 쓴다 — 셸 모달의 명상 보드가 같은 값을 읽는다.
 * 그래서 점수 식도 셸과 같은 한 벌이어야 한다(아래 `meditationPoints`). */

/**
 * 명상 점수. 셸 `calcMeditationPoints:2390` 축자 사본이다.
 * 🔴 식을 바꾸지 않는다 — 같은 필드를 두 표면이 쓰므로 식이 갈리면 화면을 옮길 때마다
 * 점수가 오르내린다.
 */
function meditationPoints(entry: DiaryLegacyEntry): number {
  const revision = Number(entry.revisionDoneCount) || 0;
  const sats = entry.satsCompleted ? 1 : 0;
  const iam = entry.iAmCompleted ? 1 : 0;
  const minutes = Number(entry.meditationMinutes) || 0;
  const points = revision * 8 + sats * 18 + iam * 10 + Math.min(15, minutes);
  return Math.max(0, Math.min(100, points));
}

function pushMeditationLog(entry: DiaryLegacyEntry, log: { type: string; trackId?: string; ok?: boolean }): void {
  const logs = Array.isArray(entry.meditationLogs) ? entry.meditationLogs : [];
  entry.meditationLogs = [...logs, { ...log, ts: Date.now() }];
}

/**
 * 실제로 1분을 들었을 때 부른다.
 * 🔴 셸은 곡을 **여는 순간** 분을 올리고 `satsCompleted` 까지 켰다(`:2516-2518`). 여기서는
 * 들은 만큼만 센다 — 재생한 적 없는 시간이 기록에 남으면 그 숫자를 볼 이유가 없어진다.
 */
export function addMeditationMinute(trackId: string): DiaryEntryMutate {
  return (entry) => {
    entry.meditationMinutes = (Number(entry.meditationMinutes) || 0) + 1;
    pushMeditationLog(entry, { type: "meditation", trackId });
    entry.meditationPoints = meditationPoints(entry);
  };
}

/** 장면을 새로 뽑았다. 키워드·본문·직전 자리를 함께 쓴다(셸 `:4456-4460`). */
export function pickSatsScene(keyword: string, scene: string, index: number): DiaryEntryMutate {
  return (entry) => {
    entry.satsKeyword = keyword;
    entry.satsScene = scene;
    entry.satsSceneLastIndex = index;
  };
}

/** 뽑은 장면을 사용자가 고쳐 쓴 것. */
export function writeSatsScene(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.satsScene = text;
  };
}

/** 장면 그리기를 마쳤다. 🔴 하루 한 번 제한을 두지 않는다 — 다시 눌러도 같은 상태다. */
export function completeSats(): DiaryEntryMutate {
  return (entry) => {
    entry.satsCompleted = true;
    pushMeditationLog(entry, { type: "sats" });
    entry.meditationPoints = meditationPoints(entry);
  };
}

/** 다시 쓰기의 두 칸. 셸 `:4424-4425` 와 같은 필드다. */
export function writeRevision(field: "original" | "imagined", text: string): DiaryEntryMutate {
  return (entry) => {
    if (field === "original") entry.revisionOriginal = text;
    else entry.revisionImagined = text;
  };
}

/**
 * 다시 쓰기를 한 번 마쳤다.
 * 🔴 셸은 여기서 `meditationMinutes` 도 1 올렸지만(`:4443`) 따라가지 않는다 — 그 칸은
 * **들은 시간**이고, 글을 고쳐 쓴 것을 들은 시간으로 세면 위 규칙이 무너진다.
 */
export function completeRevision(): DiaryEntryMutate {
  return (entry) => {
    entry.revisionDoneCount = (Number(entry.revisionDoneCount) || 0) + 1;
    pushMeditationLog(entry, { type: "revision" });
    entry.meditationPoints = meditationPoints(entry);
  };
}

/** 뽑은 문장을 사용자가 고쳐 쓴 것. 자리(`iAmLastIndex`)는 뽑기 전용이라 건드리지 않는다. */
export function writeIamAffirmation(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.iAmAffirmation = text;
  };
}

/** 문장을 새로 뽑았다. 아직 담은 것은 아니므로 완료 표시는 건드리지 않는다. */
export function pickIamAffirmation(text: string, index: number): DiaryEntryMutate {
  return (entry) => {
    entry.iAmAffirmation = text;
    entry.iAmLastIndex = index;
  };
}

/**
 * 오늘의 문장으로 담았다.
 * 🔴 셸은 카드와 **한 글자까지 같게** 받아쳐야 완료로 쳤다(`:4513`). 여기서는 자기 문장을
 * 그대로 담을 수 있게 한다 — 받아쓰기를 시키려고 만든 자리가 아니다.
 */
export function completeIam(text: string): DiaryEntryMutate {
  return (entry) => {
    entry.iAmAffirmation = text;
    entry.iAmCompleted = true;
    pushMeditationLog(entry, { type: "iam", ok: true });
    entry.meditationPoints = meditationPoints(entry);
  };
}
