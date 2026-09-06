/**
 * 다이어리 백업 — 기기의 기록을 파일 하나로 내보내고, 그 파일을 다시 합친다.
 *
 * 🔴 **이 레포에서 사용자의 기록을 잃을 수 있는 유일한 자리다.** 그래서 규칙 셋을 코드 모양으로
 * 박아 둔다:
 *  1. **저장소는 계약 모듈로만 연다** — `diary-store.js`(공유 v2) · `diary-ext-store.js`(앱 전용
 *     확장). 여기서 키 문자열을 새로 만들지 않는다.
 *  2. **합치기는 기기 쪽이 이긴다** — 양쪽에 있는 날은 그대로 둔다. 백업이 기기의 기록을
 *     덮는 경우는 둘뿐이다: 기기 쪽이 **빈 날**이거나, 확장 기록의 `updatedAt` 이 **더 새것**일 때.
 *     그래서 이 경로에는 되돌릴 대상이 원래 없고, 그럼에도 반영 직전에 지금 상태를 파일로 한 번
 *     더 내려받는다(계획서 §2 — 되돌릴 유일한 수단).
 *  3. **모르는 것을 버리지 않는다** — 날짜 객체를 통째로 옮기므로 이 코드가 모르는 필드도 함께
 *     간다. 파일의 모르는 최상위 키도 거절 사유가 아니다(뒤 버전이 더할 자리다).
 *
 * 🔴 되돌리기가 필요한 **완전 복원**은 합치기가 아니라 「기록 전체 지우기 → 불러오기」다.
 * 지우기 쪽에 2단 확인이 있는 이유가 그것이다 — 파괴적인 경로를 합치기에 숨기지 않는다.
 */

import {
  clearDiaryStore,
  createDiaryEntry,
  ensureDiaryEntryShape,
  readDiaryStore,
  writeDiaryStore,
} from './diary-store.js';
import {
  clearExtDays,
  clearLastBackupAt,
  readAllExtDays,
  writeExtDays,
} from './diary-ext-store.js';

/** 파일이 이 앱의 백업임을 밝히는 표식. 다른 JSON 을 실수로 불러오는 것을 여기서 막는다. */
export const DIARY_BACKUP_FORMAT = 'code-destiny.diary.backup';

/** 이 코드가 읽을 수 있는 최고 버전. 더 높은 파일은 **거절한다**(모르는 규칙으로 병합하지 않는다). */
export const DIARY_BACKUP_FORMAT_VERSION = 1;

/**
 * 파일 글자 수 상한. `JSON.parse` 는 큰 입력에서 탭을 통째로 멈추므로 파싱 **전에** 자른다.
 * 기록 10년치가 이 아래다(월 샤드 실측 ≈ 90KB/달).
 */
export const DIARY_BACKUP_MAX_CHARS = 16 * 1024 * 1024;

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 형식뿐 아니라 **실재하는 날짜**인지까지 본다 — `2026-02-31` 은 어느 달력에도 없다. */
function isRealYmd(ymd) {
  if (typeof ymd !== 'string' || !YMD_PATTERN.test(ymd)) return false;
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day
  );
}

/**
 * 무결성 해시. 파일이 잘리거나 옮기다 깨진 것을 반영 **전에** 잡는다.
 * 🔴 공격 방어가 아니라 **손상 검출**이다 — `crypto.subtle` 이 없는 환경(비보안 컨텍스트)에서는
 * `null` 을 돌려주고, 그때는 해시 칸 없이 내보내고 대조도 건너뛴다.
 */
async function sha256Hex(text) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle || typeof TextEncoder === 'undefined') return null;
  try {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    return null;
  }
}

/** 확장 기록 안의 항목 수(일정 + 할 일). 내보내기 요약과 미리보기가 같은 셈을 쓴다. */
function countExtItems(days) {
  let items = 0;
  for (const ymd of Object.keys(days)) {
    const day = days[ymd] || {};
    if (Array.isArray(day.schedules)) items += day.schedules.length;
    if (Array.isArray(day.todos)) items += day.todos.length;
  }
  return items;
}

/**
 * 두 계약의 맵을 받아 「기록이 얼마나 있는가」를 센다.
 *
 * 🔴 **세는 규칙은 이 함수 하나다** — 내보내기 파일의 `counts`, 허브 화면의 안내, 전체 삭제
 * 확인 화면의 수치가 전부 여기서 나온다. 화면이 제 손으로 다시 세면 "지울 대상 12일"과
 * 실제로 지워지는 것이 어긋나고, 그 어긋남은 지운 뒤에야 드러난다.
 * 🔴 화면은 이미 하이드레이션한 스냅샷을 넘긴다 — 저장소를 두 번째로 열지 않게(원칙 6).
 */
export function countDiaryData(legacy, ext) {
  const legacyDays = legacy && typeof legacy === 'object' ? legacy : {};
  const extDays = ext && typeof ext === 'object' ? ext : {};
  const dates = new Set([...Object.keys(legacyDays), ...Object.keys(extDays)].filter(isRealYmd));
  return { days: dates.size, extDays: Object.keys(extDays).length, items: countExtItems(extDays) };
}

/** 저장소에서 바로 센다 — 백업 파일의 `counts` 칸이 쓰는 진입점이다. */
export function summarizeDiaryData(storage) {
  return countDiaryData(readDiaryStore(storage), readAllExtDays(storage));
}

/**
 * 내보낼 파일 객체를 만든다. 🔴 두 계약을 **있는 그대로** 담는다 — 여기서 값을 다듬으면
 * 백업이 원본과 달라지고, 그 차이는 복원할 때에야 드러난다.
 */
export async function buildDiaryBackup(storage, exportedAt) {
  const payload = {
    legacy: { diary: readDiaryStore(storage) },
    ext: { days: readAllExtDays(storage) },
  };
  const integrity = await sha256Hex(JSON.stringify(payload));

  return {
    format: DIARY_BACKUP_FORMAT,
    formatVersion: DIARY_BACKUP_FORMAT_VERSION,
    exportedAt: String(exportedAt || new Date().toISOString()),
    counts: summarizeDiaryData(storage),
    integrity: integrity ? { algorithm: 'SHA-256', value: integrity } : null,
    payload,
  };
}

/** 날짜 맵에서 실재하는 날짜만 남긴다. 걸러 낸 개수는 화면이 그대로 보여 준다(조용히 버리지 않는다). */
function keepRealDays(source) {
  const map = {};
  let dropped = 0;
  if (source && typeof source === 'object') {
    for (const ymd of Object.keys(source)) {
      const value = source[ymd];
      if (!isRealYmd(ymd) || !value || typeof value !== 'object') {
        dropped += 1;
        continue;
      }
      map[ymd] = value;
    }
  }
  return { map, dropped };
}

/**
 * 파일 문자열 → 검증된 백업 객체.
 *
 * 🔴 **방어 순서가 계약이다**(계획서 §2): 크기 상한 → `JSON.parse` → `format` → 더 새 버전 거절
 * → 해시 대조 → 날짜 키 정규식 + 실재성. 순서를 바꾸면 큰 쓰레기 파일이 파서까지 도달한다.
 *
 * @returns `{ ok:true, backup, dropped }` 또는 `{ ok:false, reason }`.
 *   reason: `too-large` · `not-json` · `not-backup` · `newer-version` · `integrity` · `empty`
 */
export async function parseDiaryBackup(text) {
  const source = typeof text === 'string' ? text : '';
  if (source.length > DIARY_BACKUP_MAX_CHARS) return { ok: false, reason: 'too-large' };

  let raw = null;
  try {
    raw = JSON.parse(source);
  } catch (e) {
    return { ok: false, reason: 'not-json' };
  }
  if (!raw || typeof raw !== 'object' || raw.format !== DIARY_BACKUP_FORMAT) {
    return { ok: false, reason: 'not-backup' };
  }

  const version = Number(raw.formatVersion);
  if (!Number.isFinite(version) || version > DIARY_BACKUP_FORMAT_VERSION) {
    return { ok: false, reason: 'newer-version' };
  }

  const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : null;
  if (!payload) return { ok: false, reason: 'not-backup' };

  /* 해시가 적혀 있을 때만 대조한다. 🔴 대조는 **다듬기 전 payload** 로 한다 — 날짜를 걸러 낸 뒤에
     세면 원본 파일이 아니라 이 코드의 결과를 검사하게 된다. */
  const declared = raw.integrity && typeof raw.integrity === 'object' ? String(raw.integrity.value || '') : '';
  if (declared) {
    const actual = await sha256Hex(JSON.stringify(payload));
    if (actual && actual !== declared) return { ok: false, reason: 'integrity' };
  }

  const legacy = keepRealDays(payload.legacy && payload.legacy.diary);
  const ext = keepRealDays(payload.ext && payload.ext.days);
  const dropped = legacy.dropped + ext.dropped;
  if (Object.keys(legacy.map).length === 0 && Object.keys(ext.map).length === 0) {
    return { ok: false, reason: 'empty' };
  }

  /* 🔴 모르는 최상위 키를 버리지 않는다 — 뒤 버전이 더할 자리이고, 거절 사유도 아니다. */
  return {
    ok: true,
    dropped,
    backup: {
      ...raw,
      payload: {
        ...payload,
        legacy: { ...(payload.legacy || {}), diary: legacy.map },
        ext: { ...(payload.ext || {}), days: ext.map },
      },
    },
  };
}

/**
 * 기기의 v2 엔트리가 「빈 날」인가. 셸 모달은 열기만 해도 오늘 엔트리를 만들어 두므로,
 * 이 판정이 없으면 갓 켠 기기가 **오늘 하루치만** 복원을 못 받는다.
 * 🔴 골격을 채운 뒤에 비교한다 — 필드가 덜 채워진 엔트리를 "값이 있다"로 읽지 않으려는 것이다.
 */
function isEmptyLegacyEntry(entry, ymd) {
  if (!entry || typeof entry !== 'object') return true;

  let filled = null;
  try {
    filled = JSON.parse(JSON.stringify(entry));
  } catch (e) {
    return false;
  }
  ensureDiaryEntryShape(filled);

  const empty = createDiaryEntry(ymd);
  for (const key of new Set([...Object.keys(empty), ...Object.keys(filled)])) {
    if (key === 'date') continue;
    const value = filled[key];
    /* 🔴 아예 없는 필드는 빈 것과 같다 — `ensureDiaryEntryShape` 가 채우지 않는 자리
       (`lotto`·`feedback`·`nightLog`·`moodEmoji`)가 있어서, 없는 것을 값으로 세면
       셸이 만들어 둔 빈 엔트리가 "내용 있음"으로 잘못 잡힌다. */
    if (value === undefined) continue;
    if (JSON.stringify(value) !== JSON.stringify(empty[key])) return false;
  }
  return true;
}

/** 확장 하루치가 「빈 날」인가. `updatedAt` 은 내용이 아니라 흔적이라 세지 않는다. */
function isEmptyExtDay(day) {
  if (!day || typeof day !== 'object') return true;
  for (const key of Object.keys(day)) {
    if (key === 'updatedAt') continue;
    const value = day[key];
    if (Array.isArray(value)) {
      if (value.length > 0) return false;
      continue;
    }
    if (value === null || value === undefined || value === '' || value === false) continue;
    return false;
  }
  return true;
}

/** ISO 문자열 신구 비교. 형식이 같아 사전순이 곧 시간순이다(둘 다 `toISOString()` 산출물). */
function isNewer(incoming, current) {
  if (typeof incoming !== 'string' || !incoming) return false;
  if (typeof current !== 'string' || !current) return true;
  return incoming > current;
}

/**
 * 무엇이 반영되는지 미리 센다. 🔴 미리보기와 실제 반영이 **같은 함수**를 부른다 —
 * 세는 코드와 쓰는 코드가 갈리면 화면에 보여 준 숫자가 보증이 아니게 된다.
 *
 * 한 날짜가 두 축(v2 · 확장)에서 다르게 갈리면 센 축은 **덮어씀 > 추가 > 그대로** 순으로 하나만 잡는다.
 */
export function planDiaryBackupMerge(storage, backup) {
  const fileLegacy = (backup && backup.payload && backup.payload.legacy && backup.payload.legacy.diary) || {};
  const fileExt = (backup && backup.payload && backup.payload.ext && backup.payload.ext.days) || {};

  const localLegacy = readDiaryStore(storage);
  const localExt = readAllExtDays(storage);

  const legacyWrites = {};
  const extWrites = {};
  const added = new Set();
  const overwritten = new Set();
  const kept = new Set();

  for (const ymd of Object.keys(fileLegacy)) {
    const incoming = fileLegacy[ymd];
    const current = localLegacy[ymd];
    if (!current || typeof current !== 'object') {
      legacyWrites[ymd] = incoming;
      added.add(ymd);
    } else if (isEmptyLegacyEntry(current, ymd) && !isEmptyLegacyEntry(incoming, ymd)) {
      legacyWrites[ymd] = incoming;
      overwritten.add(ymd);
    } else {
      kept.add(ymd);
    }
  }

  for (const ymd of Object.keys(fileExt)) {
    const incoming = fileExt[ymd];
    const current = localExt[ymd];
    if (!current || typeof current !== 'object') {
      extWrites[ymd] = incoming;
      added.add(ymd);
    } else if (isEmptyExtDay(current) && !isEmptyExtDay(incoming)) {
      extWrites[ymd] = incoming;
      overwritten.add(ymd);
    } else if (isNewer(incoming.updatedAt, current.updatedAt)) {
      extWrites[ymd] = incoming;
      overwritten.add(ymd);
    } else {
      kept.add(ymd);
    }
  }

  for (const ymd of overwritten) {
    added.delete(ymd);
    kept.delete(ymd);
  }
  for (const ymd of added) kept.delete(ymd);

  return {
    legacyWrites,
    extWrites,
    counts: { added: added.size, overwritten: overwritten.size, kept: kept.size },
  };
}

/**
 * 계획대로 저장한다. 🔴 저장 직전에 저장소를 **다시 읽는다** — 미리보기를 띄워 둔 사이에 셸
 * 모달이나 다른 탭이 쓴 값이 있으면 그것을 덮지 않으려는 것이다(`updateDiaryEntry` 와 같은 이유).
 *
 * @returns `{ ok, added, overwritten, kept }`. 저장에 실패하면 `ok:false` 이고, 그때까지 쓰인
 *   날짜는 그대로 남는다(합치기는 기기의 기록을 지우지 않으므로 부분 반영이 손실이 아니다).
 */
export function applyDiaryBackup(storage, backup) {
  const plan = planDiaryBackupMerge(storage, backup);

  if (Object.keys(plan.legacyWrites).length > 0) {
    const store = readDiaryStore(storage);
    for (const ymd of Object.keys(plan.legacyWrites)) store[ymd] = plan.legacyWrites[ymd];
    if (!writeDiaryStore(storage, store)) return { ok: false, ...plan.counts };
  }

  if (Object.keys(plan.extWrites).length > 0) {
    if (!writeExtDays(storage, plan.extWrites)) return { ok: false, ...plan.counts };
  }

  return { ok: true, ...plan.counts };
}

/**
 * 기록을 전부 지운다 — 공유 v2 키 + 확장 월 샤드 전부 + 마지막 백업 시각.
 *
 * 🔴 **셸 모달의 기록도 함께 사라진다**(v2 는 공유 키다). 그래서 부르는 화면이 2단 확인을 받고,
 * 지우기 전에 내보내기를 권한다. 🔴 지우는 범위는 이 두 계약이 아는 키뿐이다 — 다른 기능의
 * 저장 키는 이름이 비슷해도 건드리지 않는다.
 */
export function clearDiaryData(storage) {
  const removedShards = clearExtDays(storage);
  const removedStore = clearDiaryStore(storage);
  clearLastBackupAt(storage);
  return { ok: removedStore, removedShards };
}
