/**
 * 다이어리 확장 저장 계약 — `/diary` **만** 쓰는 신규 키다(`cd.diary.ext.v1.day.<YYYY-MM>`).
 *
 * 🔴 셸 모달이 쓰는 `luck_sync_diary_v2` 를 이 파일은 **한 글자도 건드리지 않는다.** 확장 필드를
 * 그 키에 얹으면 셸의 `ensureEntryShape` 가 모르는 필드를 안고 다니게 되고, 두 표면이 같은
 * 자리를 서로 다른 뜻으로 쓰기 시작한다. 그래서 공유 필드는 `diary-store.js`, 앱 전용 필드는
 * 여기로 **키 자체를 갈라 둔다** — 그 분리가 기록 유실을 막는 유일한 구조적 장치다.
 *
 * 🔴 저장소를 만지는 앱 코드는 이 모듈이나 `diary-store.js` 중 하나를 반드시 거친다 —
 * `__tests__/ui/diary-store-roundtrip.test.js` 가 `app/diary/**` 를 전수 발견해 강제한다.
 *
 * ── 월 샤드인 이유 ──────────────────────────────────────────────────────────
 * 저장 한 번이 그 달치만 `JSON.stringify` 하면 되게 하려는 것이다(계획서 §2). 평면 맵 하나로
 * 두면 기록이 쌓인 기기에서 항목 하나 체크할 때마다 전체를 다시 쓴다.
 *
 * 🔴 색인(`cd.diary.ext.v1.meta`)은 만들지 않았다 — 읽는 쪽이 아직 없고, 샤드와 어긋날 수 있는
 * 두 번째 진실을 미리 만드는 값이 없다. 필요해지는 PR(통계·백업)에서 샤드에서 유도해 만든다.
 */

/** 확장 월 샤드 키 앞자리. 🔴 이 문자열을 화면 코드에 복사하지 않는다(키 조립은 여기서만). */
export const DIARY_EXT_DAY_KEY_PREFIX = 'cd.diary.ext.v1.day.';

/** 한 항목의 글자 상한. 계획 칸은 한 줄짜리 목록이라 길어지면 그 자리에서 읽히지 않는다. */
export const DIARY_EXT_TEXT_MAX = 60;

/** `YYYY-MM-DD` → `cd.diary.ext.v1.day.YYYY-MM`. 날짜 형식이 아니면 `null` 이다. */
export function diaryExtMonthKey(ymd) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return DIARY_EXT_DAY_KEY_PREFIX + ymd.slice(0, 7);
}

/**
 * 하루치 확장 기록의 빈 골격. 🔴 모르는 키는 그대로 둔다 — 뒤 PR(태그·성취·회고)이 같은
 * 날짜 객체에 필드를 더하므로, 이번 화면이 모른다는 이유로 떨어뜨리면 그것이 기록 손실이다.
 */
export function ensureExtDayShape(day) {
  if (!day || typeof day !== 'object') return;
  if (!Array.isArray(day.schedules)) day.schedules = [];
  if (!Array.isArray(day.todos)) day.todos = [];
}

/** 항목 id. 같은 초에 두 개를 더해도 갈리도록 난수를 붙인다. */
export function createExtItemId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 월 샤드 하나를 읽는다. 깨진 JSON 은 `diary-store.js` 와 같이 조용히 빈 객체다. */
export function readExtMonth(storage, monthKey) {
  try {
    const parsed = JSON.parse(storage.getItem(monthKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

/** 월 샤드 하나를 쓴다. 실패하면 `false`(저장소가 가득 찬 기기). */
export function writeExtMonth(storage, monthKey, month) {
  try {
    storage.setItem(monthKey, JSON.stringify(month));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 저장된 확장 샤드 키를 모은다. 🔴 **훑기는 이 함수 하나다** — 읽기와 삭제가 각자 저장소를
 * 훑으면 "확장 키란 무엇인가"의 판정이 두 곳이 된다(원칙 6).
 * 🔴 목록을 먼저 만들고 나서 지운다 — 훑는 도중에 지우면 `key(i)` 의 인덱스가 밀려 건너뛴다.
 */
export function listExtMonthKeys(storage) {
  const keys = [];
  let count = 0;
  try {
    count = Number(storage.length) || 0;
  } catch (e) {
    count = 0;
  }

  for (let index = 0; index < count; index += 1) {
    let key = null;
    try {
      key = storage.key(index);
    } catch (e) {
      key = null;
    }
    if (typeof key === 'string' && key.startsWith(DIARY_EXT_DAY_KEY_PREFIX)) keys.push(key);
  }
  return keys;
}

/**
 * 저장된 확장 샤드를 전부 읽어 **날짜 키 하나짜리 평면 맵**으로 편다.
 * 화면 리더가 하나뿐이어야 하므로(`app/diary/_lib/ext-snapshot.ts`) 하이드레이션 때 한 번 부른다.
 */
export function readAllExtDays(storage) {
  const days = {};
  for (const key of listExtMonthKeys(storage)) {
    const month = readExtMonth(storage, key);
    for (const ymd of Object.keys(month)) {
      const day = month[ymd];
      if (!day || typeof day !== 'object') continue;
      days[ymd] = day;
    }
  }
  return days;
}

/**
 * 하루치 확장 기록을 고쳐 저장한다. **그 달 샤드를 다시 읽어 → 그 날짜만 병합 → 그 샤드만 쓰기.**
 *
 * 🔴 화면이 들고 있던 사본을 저장에 쓰지 않는 것은 `updateDiaryEntry` 와 같은 이유다 — 탭이
 * 둘 열려 있으면 오래된 사본이 상대가 쓴 값을 덮는다.
 *
 * `updatedAt` 은 나중 PR 의 백업 병합 기준이다(계획서 §2 의 `merge` 모드가 날짜별로 비교한다).
 *
 * @returns 성공하면 저장 뒤의 평면 맵(새 참조), 실패하면 `null`.
 */
export function updateExtDay(storage, ymd, mutate) {
  const monthKey = diaryExtMonthKey(ymd);
  if (!monthKey) return null;

  const month = readExtMonth(storage, monthKey);
  if (!month[ymd] || typeof month[ymd] !== 'object') month[ymd] = {};
  ensureExtDayShape(month[ymd]);
  mutate(month[ymd]);
  month[ymd].updatedAt = new Date().toISOString();

  if (!writeExtMonth(storage, monthKey, month)) return null;
  return readAllExtDays(storage);
}

/**
 * 여러 날치를 한 번에 저장한다 — 달마다 샤드를 **한 번씩만** 읽고 쓴다.
 * 불러오기가 날짜 수백 개를 넣을 때 `updateExtDay` 를 날마다 부르면 같은 샤드를 그 수만큼
 * 다시 쓰게 되고, 도중에 실패하면 절반만 반영된 상태가 남는다.
 *
 * 🔴 `updatedAt` 을 여기서 새로 찍지 않는다 — 백업 파일이 들고 온 시각이 병합 기준이라
 * 지금 시각으로 덮으면 다음 불러오기의 신구 판정이 통째로 무너진다.
 * 🔴 날짜 형식이 아닌 키가 하나라도 있으면 **아무것도 쓰지 않는다** — 어느 달에도 안 잡히는
 * 샤드를 만드는 대신 통째로 거절한다.
 *
 * @returns 성공하면 저장 뒤의 평면 맵(새 참조), 실패하면 `null`.
 */
export function writeExtDays(storage, days) {
  if (!days || typeof days !== 'object') return null;

  const byMonth = new Map();
  for (const ymd of Object.keys(days)) {
    const monthKey = diaryExtMonthKey(ymd);
    if (!monthKey) return null;
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, readExtMonth(storage, monthKey));
    byMonth.get(monthKey)[ymd] = days[ymd];
  }

  for (const [monthKey, month] of byMonth) {
    if (!writeExtMonth(storage, monthKey, month)) return null;
  }
  return readAllExtDays(storage);
}

/**
 * `/diary` 확장 샤드를 전부 지운다. 🔴 지우는 범위는 **이 모듈이 아는 앞자리뿐**이다 —
 * 이름이 비슷한 다른 기능의 키는 건드리지 않는다.
 *
 * @returns 지운 키 개수.
 */
export function clearExtDays(storage) {
  let removed = 0;
  for (const key of listExtMonthKeys(storage)) {
    try {
      storage.removeItem(key);
      removed += 1;
    } catch (e) {
      /* 지우지 못한 키는 남는다 — 부분 삭제를 성공처럼 세지 않으려고 세지도 않는다. */
    }
  }
  return removed;
}

/**
 * 마지막으로 백업 파일을 만든 시각. 🔴 **날짜 샤드가 아니다** — 앞자리가 `...v1.day.` 가
 * 아니므로 `listExtMonthKeys` 의 훑기에 걸리지 않는다.
 * 🔴 백업 파일 안에는 넣지 않는다 — 파일을 다른 기기로 옮겨도 「마지막 백업」은 그 기기의 사실이다.
 */
export const DIARY_BACKUP_META_KEY = 'cd.diary.ext.v1.backup';

/** 마지막 백업 시각(ISO). 없거나 깨졌으면 빈 문자열이다. */
export function readLastBackupAt(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(DIARY_BACKUP_META_KEY) || '{}');
    return parsed && typeof parsed.at === 'string' ? parsed.at : '';
  } catch (e) {
    return '';
  }
}

/** 마지막 백업 시각을 적는다. 실패해도 백업 자체는 이미 끝났으므로 조용히 `false` 다. */
export function writeLastBackupAt(storage, at) {
  try {
    storage.setItem(DIARY_BACKUP_META_KEY, JSON.stringify({ at: String(at || '') }));
    return true;
  } catch (e) {
    return false;
  }
}

/** 마지막 백업 시각을 지운다. 기록 전체 삭제가 이 흔적까지 같이 데려간다. */
export function clearLastBackupAt(storage) {
  try {
    storage.removeItem(DIARY_BACKUP_META_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
