/**
 * 다이어리 저장 계약 — `js/luck-sync-diary.js` 축자 복사본.
 *
 * 🔴 **기존 사용자의 기록을 한 건도 잃지 않는다.** 셸 모달과 `/diary` 는 같은 기기의
 * **같은 localStorage 키 하나**를 공유한다. 두 표면이 각자 저장 코드를 가지면 키가
 * 갈리거나 한쪽이 상대의 필드를 지우는데, 그때 사라지는 것은 사용자의 기록이다.
 * 그래서 계약을 여기 한 곳에 두고 **양쪽이 이것만 쓴다.**
 *
 * 동치는 `__tests__/ui/diary-store-roundtrip.test.js` 가 셸 원본 함수를 중괄호 균형으로
 * 잘라내 **실제로 실행**해 매번 다시 증명한다(왕복 4방향). 그 테스트가
 * PR-E 의 수동 왕복 시나리오(`/diary` 저장 → 셸 확인 → 셸 저장 → `/diary` 확인)를 대체한다.
 *
 * 원본 위치(2026-09-06 기준): `js/luck-sync-diary.js` — LS_KEY:587 / ensureEntryShape:602 /
 * loadDiary:648 / saveDiary:731 / getTodayEntry:806
 *
 * ── 원본에서 바뀐 것 (계약이 아니라 배선) ────────────────────────────────────
 * 1. 전역 `localStorage` 를 **`storage` 인자로 승격**했다. `/diary` 는 정적 export 라
 *    모듈 최상위에서 `localStorage` 를 만지면 빌드 시점에 터진다.
 * 2. 저장 실패 시 `showDiaryToast(...)` 호출을 뺐다 — 토스트는 셸 모달 DOM 전용이다.
 *    반환값 계약(성공 `true` · 실패 `false`)은 그대로다.
 * 3. `getTodayEntry(diary)` 가 안에서 오늘 키를 만들던 것을 `getDiaryEntry(store, ymd)` 로
 *    **키를 인자로 승격**했다. 날짜축 정본은 `app/diary/_lib/kst-date.ts` 다(새로 만들지 않는다).
 *
 * 🔴 필드를 **지우지 않는다** — 모르는 키가 들어와도 그대로 둔다. 셸이 뒤에 추가할
 * 필드를 `/diary` 가 모른다는 이유로 떨어뜨리면 그것이 곧 기록 손실이다.
 */

/** 셸 모달과 공유하는 단 하나의 저장 키. 🔴 이 문자열이 갈리면 두 표면의 기록이 분리된다. */
export const DIARY_STORAGE_KEY = 'luck_sync_diary_v2';

/** 날짜 키 형식 — `YYYY-MM-DD`. 셸의 `_formatDateKeyParts:284` 가 만드는 것과 같다. */
export const DIARY_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 엔트리에 빠진 필드를 채운다. 있는 값은 건드리지 않고, 모르는 키도 그대로 둔다.
 * 원본 `ensureEntryShape:602` 축자 사본.
 */
export function ensureDiaryEntryShape(entry) {
  if (!entry || typeof entry !== 'object') return;
  if (!Array.isArray(entry.challenges)) entry.challenges = [];
  if (!Array.isArray(entry.emotionTags)) entry.emotionTags = [];
  if (!Array.isArray(entry.stickers)) entry.stickers = [];
  if (!Array.isArray(entry.badges)) entry.badges = [];
  if (!Array.isArray(entry.nightPractices)) entry.nightPractices = [];
  if (!Array.isArray(entry.actionPlan)) entry.actionPlan = [];
  if (!Array.isArray(entry.challengeCatalog)) entry.challengeCatalog = [];
  if (!Array.isArray(entry.tomorrowActionPlan)) entry.tomorrowActionPlan = [];
  if (!Array.isArray(entry.meditationLogs)) entry.meditationLogs = [];
  if (typeof entry.challengeTotalToday !== 'number') entry.challengeTotalToday = 0;
  if (typeof entry.tomorrowPlanTheme !== 'string') entry.tomorrowPlanTheme = '';
  if (typeof entry.reviewRate !== 'number') entry.reviewRate = 0;
  if (typeof entry.reviewNote !== 'string') entry.reviewNote = '';
  if (typeof entry.practiceNote !== 'string') entry.practiceNote = entry.reviewNote || entry.nightLog || '';
  if (typeof entry.aiLuckCoach !== 'string') entry.aiLuckCoach = '';
  if (typeof entry.aiCoachUpdatedAt !== 'string') entry.aiCoachUpdatedAt = '';
  if (typeof entry.tomorrowBlueprint !== 'string') entry.tomorrowBlueprint = '';
  if (typeof entry.revisionOriginal !== 'string') entry.revisionOriginal = '';
  if (typeof entry.revisionImagined !== 'string') entry.revisionImagined = '';
  if (typeof entry.revisionDoneCount !== 'number') entry.revisionDoneCount = 0;
  if (typeof entry.satsKeyword !== 'string') entry.satsKeyword = '';
  if (typeof entry.satsScene !== 'string') entry.satsScene = '';
  if (typeof entry.satsSceneLastIndex !== 'number') entry.satsSceneLastIndex = -1;
  if (typeof entry.satsCompleted !== 'boolean') entry.satsCompleted = false;
  if (typeof entry.iAmAffirmation !== 'string') entry.iAmAffirmation = '';
  if (typeof entry.iAmCompleted !== 'boolean') entry.iAmCompleted = false;
  if (typeof entry.iAmLastIndex !== 'number') entry.iAmLastIndex = -1;
  if (typeof entry.meditationMinutes !== 'number') entry.meditationMinutes = 0;
  if (typeof entry.meditationPoints !== 'number') entry.meditationPoints = 0;
  if (typeof entry.memoNote !== 'string') entry.memoNote = '';
  if (typeof entry.morningFortune !== 'string') entry.morningFortune = '';
  if (typeof entry.partnerName !== 'string') entry.partnerName = '';
  if (typeof entry.partnerBirthYear !== 'string') entry.partnerBirthYear = '';
  if (typeof entry.partnerBirthDate !== 'string') entry.partnerBirthDate = '';
  if (typeof entry.partnerBirthTime !== 'string') entry.partnerBirthTime = '12:00';
  if (typeof entry.partnerBirthCity !== 'string') entry.partnerBirthCity = '서울';
  if (typeof entry.compatType !== 'string') entry.compatType = 'love';
  if (typeof entry.shareNickname !== 'string') entry.shareNickname = '';
  if (typeof entry.shareCaption !== 'string') entry.shareCaption = '';
  if (typeof entry.shareTheme !== 'string') entry.shareTheme = 'vivid';
  if (typeof entry.shareUseSticker !== 'boolean') entry.shareUseSticker = true;
  if (typeof entry.shareUseBadge !== 'boolean') entry.shareUseBadge = true;
}

/**
 * 하루치 빈 엔트리를 만든다. 원본 `getTodayEntry:809-839` 의 리터럴 축자 사본이고,
 * 나머지 필드는 원본과 같이 `ensureDiaryEntryShape` 가 채운다.
 */
export function createDiaryEntry(ymd) {
  const entry = {
    date: ymd,
    challenges: [],
    lotto: null,
    nightLog: '',
    feedback: null,
    moodEmoji: '',
    nightPractices: [],
    actionPlan: [],
    challengeCatalog: [],
    challengeTotalToday: 0,
    practiceNote: '',
    aiLuckCoach: '',
    aiCoachUpdatedAt: '',
    tomorrowBlueprint: '',
    tomorrowActionPlan: [],
    tomorrowPlanTheme: '',
    revisionOriginal: '',
    revisionImagined: '',
    revisionDoneCount: 0,
    satsKeyword: '',
    satsScene: '',
    satsSceneLastIndex: -1,
    satsCompleted: false,
    iAmAffirmation: '',
    iAmCompleted: false,
    iAmLastIndex: -1,
    meditationMinutes: 0,
    meditationPoints: 0,
    meditationLogs: [],
  };
  ensureDiaryEntryShape(entry);
  return entry;
}

/**
 * 저장소 전체를 읽는다. 원본 `loadDiary:648` 축자 사본 — 깨진 JSON 은 조용히 `{}` 다.
 * 🔴 여기서 던지면 `/diary` 첫 화면이 통째로 비므로 원본과 같이 삼킨다.
 */
export function readDiaryStore(storage) {
  try {
    return JSON.parse(storage.getItem(DIARY_STORAGE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

/** 저장소 전체를 쓴다. 원본 `saveDiary:731` 축자 사본(토스트 제외). 실패하면 `false`. */
export function writeDiaryStore(storage, data) {
  try {
    storage.setItem(DIARY_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 하루치 엔트리를 꺼낸다. 없으면 만들어 **저장소 객체에 꽂고** 그 참조를 돌려준다 —
 * 원본 `getTodayEntry:806` 과 같은 동작이라, 호출자는 받은 객체를 고친 뒤
 * `writeDiaryStore(storage, store)` 한 번으로 저장한다.
 */
export function getDiaryEntry(store, ymd) {
  if (!store[ymd]) store[ymd] = createDiaryEntry(ymd);
  ensureDiaryEntryShape(store[ymd]);
  return store[ymd];
}

/**
 * 공유 저장 키를 통째로 지운다. 🔴 **셸 모달의 기록도 같은 키다** — 여기서 지우면 두 표면의
 * 기록이 함께 사라진다. 그래서 이 함수는 확인을 받지 않는다(확인은 부르는 화면의 몫이고,
 * `app/diary/_components/DiaryBackupPanel.tsx` 가 2단 확인 뒤에만 부른다).
 */
export function clearDiaryStore(storage) {
  try {
    storage.removeItem(DIARY_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 하루치를 고쳐 저장한다. **읽기 → 단일 날짜 병합 → 쓰기** 한 묶음이다.
 *
 * 🔴 저장 직전에 저장소를 **다시 읽는** 것이 핵심이다. 셸 모달의 저장 호출부 20여 곳이 전부
 * `var d = loadDiary(); …; saveDiary(d)` 로 액션 직전에 다시 읽어서 클로버 창이 액션 단위로
 * 좁은데, `/diary` 가 화면에 들고 있던 오래된 사본을 통째로 쓰면 그 사이 셸이 저장한 값이
 * 사라진다 — 그때 없어지는 것은 사용자의 기록이다. 그래서 화면 상태를 저장에 쓰지 않는다.
 *
 * 🔴 `mutate` 는 **자기가 아는 필드만** 건드린다. 엔트리 객체를 통째로 갈아끼우지 않는다
 * (모르는 필드가 그 자리에서 사라진다).
 *
 * @returns 저장에 성공하면 방금 쓴 저장소 객체(새 참조), 실패하면 `null`.
 */
export function updateDiaryEntry(storage, ymd, mutate) {
  const store = readDiaryStore(storage);
  mutate(getDiaryEntry(store, ymd));
  return writeDiaryStore(storage, store) ? store : null;
}
