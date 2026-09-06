/**
 * 백업 파일의 **입출력만** 맡는다 — 내려받기·읽기·마지막 백업 시각.
 *
 * 🔴 병합 규칙과 방어 순서는 여기 없다. 전부 `lib/diary/diary-backup.js` 한 곳이고, 이 파일은
 * 브라우저 API(`Blob`·`URL`·`FileReader`)를 그 순수 함수에 붙이는 얇은 껍데기다. 판정이 두 곳에
 * 갈리면 미리보기에서 센 숫자와 실제로 쓰인 결과가 달라진다(원칙 6).
 *
 * 🔴 저장소는 계약 모듈을 거친 함수로만 연다 — `window.localStorage` 를 **넘겨줄 뿐** 키를
 * 조립하지 않는다(`__tests__/ui/diary-store-roundtrip.test.js` 가 `app/diary/**` 를 전수 발견한다).
 */

import {
  buildDiaryBackup,
  applyDiaryBackup,
  clearDiaryData,
  parseDiaryBackup,
  planDiaryBackupMerge,
  DIARY_BACKUP_MAX_CHARS,
} from "@/lib/diary/diary-backup";
import { readLastBackupAt, writeLastBackupAt } from "@/lib/diary/diary-ext-store";

import { kstTodayYmd } from "./kst-date";

/** 파일 하나가 들고 오는 것. 화면은 이 요약만 보고 「반영」 버튼을 열지 말지 정한다. */
export interface DiaryBackupPreview {
  added: number;
  overwritten: number;
  kept: number;
  /** 날짜 형식이 아니라 걸러 낸 항목 수. 0 이 아니면 화면이 그대로 알린다(조용히 버리지 않는다). */
  dropped: number;
  exportedAt: string;
}

/** 파일을 읽지 못한 이유. 화면이 사유별로 다른 문장을 보여 준다(「안 됩니다」로 뭉치지 않는다). */
export type DiaryBackupFailure =
  | "too-large"
  | "not-json"
  | "not-backup"
  | "newer-version"
  | "integrity"
  | "empty"
  | "unreadable";

/**
 * 검증을 통과한 파일. 🔴 안을 들여다보는 타입을 만들지 않는다 — 화면은 이 값을 **그대로 넘길
 * 뿐**이고, 필드를 아는 곳은 `lib/diary/diary-backup.js` 하나여야 한다. 여기에 모양을 적으면
 * 파일 형식의 정본이 둘이 된다.
 */
export interface DiaryBackupFile {
  format: string;
  formatVersion: number;
  exportedAt?: string;
  [key: string]: unknown;
}

export interface DiaryBackupLoad {
  backup: DiaryBackupFile;
  preview: DiaryBackupPreview;
}

/** 브라우저 밖(프리렌더)에서는 저장소가 없다. 그 자리에서는 아무 일도 하지 않는다. */
function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 마지막으로 파일을 만든 시각(ISO). 없으면 빈 문자열이다. */
export function readDiaryBackupTime(): string {
  const store = storage();
  if (!store) return "";
  try {
    return readLastBackupAt(store);
  } catch {
    return "";
  }
}

/**
 * 백업 파일을 만들어 내려받는다.
 *
 * @param stamp 기록으로 남길지 여부. 반영 직전에 자동으로 만드는 파일은 `false` 로 부른다 —
 *   사용자가 직접 누른 백업만 「마지막 백업」에 남아야 그 표시가 사실이 된다.
 * @returns 파일 이름. 만들지 못했으면 빈 문자열이다.
 */
export async function exportDiaryBackupFile(prefix = "code-destiny-diary", stamp = true): Promise<string> {
  const store = storage();
  if (!store) return "";

  try {
    const exportedAt = new Date().toISOString();
    const backup = await buildDiaryBackup(store, exportedAt);
    const fileName = `${prefix}-${kstTodayYmd().replace(/-/g, "")}.json`;

    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    /* 🔴 되돌려주지 않으면 파일 크기만큼 메모리가 그대로 남는다. 클릭이 끝난 뒤에 푼다. */
    setTimeout(() => URL.revokeObjectURL(url), 0);

    if (stamp) writeLastBackupAt(store, exportedAt);
    return fileName;
  } catch {
    return "";
  }
}

/**
 * 고른 파일을 읽어 **무엇이 반영될지까지** 세어 돌려준다. 🔴 여기서는 한 글자도 쓰지 않는다 —
 * 미리보기 없이 반영되는 경로를 만들지 않는 것이 이 화면의 계약이다.
 */
export async function loadDiaryBackupFile(
  file: File,
): Promise<{ ok: true; data: DiaryBackupLoad } | { ok: false; reason: DiaryBackupFailure }> {
  const store = storage();
  if (!store) return { ok: false, reason: "unreadable" };

  /* 🔴 파싱 전에 파일 크기부터 본다 — 큰 파일은 `text()` 단계에서 이미 탭을 세운다. */
  if (file.size > DIARY_BACKUP_MAX_CHARS) return { ok: false, reason: "too-large" };

  let text = "";
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  /* `diary-backup.js` 는 순수 JS 라 `ok` 가 리터럴로 좁혀지지 않는다 — 판별 유니온을 여기서
     한 번 선언해 준다. 🔴 사유 목록이 갈리지 않게 `DiaryBackupFailure` 를 그대로 쓴다. */
  const parsed = (await parseDiaryBackup(text)) as
    | { ok: true; backup: DiaryBackupFile; dropped: number }
    | { ok: false; reason: DiaryBackupFailure };
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const plan = planDiaryBackupMerge(store, parsed.backup);
  return {
    ok: true,
    data: {
      backup: parsed.backup,
      preview: {
        ...plan.counts,
        dropped: parsed.dropped,
        exportedAt: typeof parsed.backup.exportedAt === "string" ? parsed.backup.exportedAt : "",
      },
    },
  };
}

/**
 * 미리보기에서 확인한 파일을 실제로 합친다.
 *
 * 🔴 **반영 직전에 지금 상태를 파일 한 개로 먼저 내려받는다**(계획서 §2). 합치기는 기기의
 * 기록을 지우지 않지만, 되돌릴 수단이 하나도 없는 채로 남의 파일을 얹는 화면을 만들지 않는다.
 */
export async function applyDiaryBackupFile(
  backup: DiaryBackupFile,
): Promise<{ ok: boolean; added: number; overwritten: number; kept: number }> {
  const store = storage();
  if (!store) return { ok: false, added: 0, overwritten: 0, kept: 0 };

  await exportDiaryBackupFile("code-destiny-diary-before-restore", false);

  try {
    return applyDiaryBackup(store, backup);
  } catch {
    return { ok: false, added: 0, overwritten: 0, kept: 0 };
  }
}

/**
 * 기록을 전부 지운다. 🔴 확인은 이 함수의 몫이 아니다 — 부르는 화면(`DiaryBackupPanel`)이
 * 2단 확인을 받은 뒤에만 부른다.
 */
export function clearDiaryDataOnDevice(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    return clearDiaryData(store).ok;
  } catch {
    return false;
  }
}
