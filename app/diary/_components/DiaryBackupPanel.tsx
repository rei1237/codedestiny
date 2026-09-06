"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import { countDiaryData } from "@/lib/diary/diary-backup";
import {
  applyDiaryBackupFile,
  clearDiaryDataOnDevice,
  exportDiaryBackupFile,
  loadDiaryBackupFile,
  readDiaryBackupTime,
  type DiaryBackupLoad,
} from "../_lib/backup-io";
import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 기록을 파일로 내보내고, 파일에서 다시 불러오고, 전부 지운다.
 *
 * 🔴 이 화면이 지키는 것 셋(계획서 §2, 목업 승인본):
 *  1. **미리보기 없이 반영되는 경로를 만들지 않는다** — 파일을 고르면 무엇이 반영될지 먼저 센다.
 *  2. **반영 직전에 지금 상태를 파일로 한 번 더 내려받는다**(`applyDiaryBackupFile` 안에서).
 *  3. **전체 삭제는 2단 확인이다** — 수치를 보여 주고, 「지웁니다」를 직접 입력해야 버튼이 열린다.
 *
 * 🔴 저장소를 여기서 열지 않는다 — 수치는 이미 하이드레이션한 스냅샷에서 세고(원칙 6), 읽기·쓰기는
 * `../_lib/backup-io` 를 거친다. 반영·삭제 뒤에는 새로고침이 아니라 `refresh()` 로 다시 읽는다.
 * 🔴 불러온 값은 전부 텍스트 노드로만 그린다 — 파일 안의 문자열을 마크업으로 해석하지 않는다.
 */

const BACKUP_TEXT = {
  ko: {
    title: "기록 내보내기·불러오기",
    lead: "기록은 이 기기 안에만 있습니다. 기기를 바꾸거나 브라우저 기록을 지우면 함께 사라지므로, 가끔 파일로 남겨 두세요.",
    held: "지금 이 기기에 있는 것",
    heldDays: "기록한 날",
    heldItems: "일정·할 일",
    unitDay: "일",
    unitItem: "개",
    lastBackup: "마지막으로 파일을 만든 날",
    lastBackupNone: "아직 파일로 남긴 적이 없습니다.",
    export: "파일로 내보내기",
    pick: "파일 불러오기",
    exported: "파일을 내려받았습니다",
    exportFailed: "파일을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    previewTitle: "이 파일을 반영하면",
    added: "새로 추가",
    overwritten: "채워짐",
    kept: "그대로",
    previewNote:
      "같은 날이 양쪽에 있으면 이 기기의 기록을 그대로 둡니다. 비어 있던 날만 파일의 내용으로 채웁니다.",
    droppedNote: "날짜 형식이 아닌 항목 {n}개는 반영하지 않습니다.",
    exportedAt: "파일을 만든 날",
    apply: "반영하기",
    cancel: "취소",
    applying: "반영하는 중…",
    applied: "새로 추가 {added}일 · 채워짐 {overwritten}일 · 그대로 {kept}일",
    applyFailed: "저장 공간이 모자라 일부만 반영되었습니다. 공간을 확보한 뒤 다시 시도해 주세요.",
    beforeApply: "반영하기 전에 지금 상태를 담은 파일을 한 개 더 내려받습니다.",
    dangerOpen: "기록 전체 지우기",
    dangerTitle: "이 기기의 기록을 전부 지웁니다",
    dangerBody:
      "기록한 날 {days}일과 일정·할 일 {items}개가 사라집니다. 운세 화면의 다이어리에 적어 둔 것도 같은 기록이라 함께 사라집니다. 되돌릴 방법은 미리 내보낸 파일뿐입니다.",
    dangerHint: "지우려면 아래에 「지웁니다」를 입력해 주세요.",
    dangerWord: "지웁니다",
    dangerConfirm: "지웁니다",
    dangerDone: "기록을 전부 지웠습니다.",
    dangerFailed: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    empty: "아직 기록이 없습니다.",
    failures: {
      "too-large": "파일이 너무 큽니다. 이 앱이 만든 파일이 맞는지 확인해 주세요.",
      "not-json": "파일을 읽지 못했습니다. 내려받다 끊겼거나 다른 형식일 수 있습니다.",
      "not-backup": "이 앱의 기록 파일이 아닙니다.",
      "newer-version": "더 새로운 버전에서 만든 파일입니다. 앱을 새로고침한 뒤 다시 시도해 주세요.",
      integrity: "파일이 옮겨지는 도중 깨졌습니다. 반영하지 않았습니다.",
      empty: "파일 안에 기록이 없습니다.",
      unreadable: "파일을 열지 못했습니다.",
    },
  },
} as const;

const copy = BACKUP_TEXT.ko;

const fill = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? 0));

export default function DiaryBackupPanel() {
  const { store, ext, hydrated } = useDiaryToday();
  const { refresh } = useDiaryWriter();

  const [lastBackup, setLastBackup] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState<DiaryBackupLoad | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerWord, setDangerWord] = useState("");

  /* 🔴 마지막 백업 시각도 이펙트에서 읽는다 — 정적 export 라 첫 렌더는 빌드 시각에 프리렌더된다. */
  useEffect(() => {
    setLastBackup(readDiaryBackupTime());
  }, []);

  const held = useMemo(() => countDiaryData(store, ext), [store, ext]);

  const onExport = useCallback(async () => {
    setBusy(true);
    const fileName = await exportDiaryBackupFile();
    setBusy(false);
    setNotice(fileName ? `${copy.exported}: ${fileName}` : copy.exportFailed);
    if (fileName) setLastBackup(readDiaryBackupTime());
  }, []);

  const onPick = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    /* 같은 파일을 다시 고를 수 있게 값을 비운다 — 비우지 않으면 두 번째 선택이 아무 일도 안 한다. */
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setLoaded(null);
    const result = await loadDiaryBackupFile(file);
    setBusy(false);

    if (!result.ok) {
      setNotice(copy.failures[result.reason]);
      return;
    }
    setNotice("");
    setLoaded(result.data);
  }, []);

  const onApply = useCallback(async () => {
    if (!loaded) return;
    setBusy(true);
    const result = await applyDiaryBackupFile(loaded.backup);
    setBusy(false);
    setLoaded(null);
    refresh();
    setNotice(
      result.ok
        ? fill(copy.applied, { added: result.added, overwritten: result.overwritten, kept: result.kept })
        : copy.applyFailed,
    );
  }, [loaded, refresh]);

  const onClear = useCallback(() => {
    const ok = clearDiaryDataOnDevice();
    setDangerOpen(false);
    setDangerWord("");
    setLoaded(null);
    refresh();
    setLastBackup("");
    setNotice(ok ? copy.dangerDone : copy.dangerFailed);
  }, [refresh]);

  const hasRecords = held.days > 0;

  return (
    <section className={styles.card} aria-labelledby="diary-backup-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="diary-backup-title">
          {copy.title}
        </h2>
      </div>
      <p className={styles.emptySmall}>{copy.lead}</p>

      <div className={styles.statTiles} aria-label={copy.held}>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {hydrated ? held.days : 0}
            <span className={styles.statUnit}>{copy.unitDay}</span>
          </span>
          <span className={styles.statLabel}>{copy.heldDays}</span>
        </p>
        <p className={styles.statTile}>
          <span className={styles.statValue}>
            {hydrated ? held.items : 0}
            <span className={styles.statUnit}>{copy.unitItem}</span>
          </span>
          <span className={styles.statLabel}>{copy.heldItems}</span>
        </p>
      </div>

      <p className={styles.fieldLabel}>
        {copy.lastBackup}
        <span className={styles.fieldHint}>
          {lastBackup ? new Date(lastBackup).toLocaleDateString("ko-KR") : copy.lastBackupNone}
        </span>
      </p>

      <div className={styles.dataActions}>
        <button type="button" className={styles.chip} onClick={onExport} disabled={busy || !hasRecords}>
          {copy.export}
        </button>
        <label className={styles.dataFile}>
          {copy.pick}
          <input
            className={styles.dataFileInput}
            type="file"
            accept="application/json,.json"
            onChange={onPick}
            disabled={busy}
          />
        </label>
      </div>

      {notice ? (
        <p className={styles.dataNotice} role="status">
          {notice}
        </p>
      ) : null}

      {loaded ? (
        <div className={styles.card}>
          <p className={styles.fieldLabel}>
            {copy.previewTitle}
            <span className={styles.fieldHint}>
              {loaded.preview.exportedAt
                ? `${copy.exportedAt} ${new Date(loaded.preview.exportedAt).toLocaleDateString("ko-KR")}`
                : ""}
            </span>
          </p>
          <div className={styles.previewTiles}>
            <p className={styles.statTile}>
              <span className={styles.statValue}>
                {loaded.preview.added}
                <span className={styles.statUnit}>{copy.unitDay}</span>
              </span>
              <span className={styles.statLabel}>{copy.added}</span>
            </p>
            <p className={styles.statTile}>
              <span className={styles.statValue}>
                {loaded.preview.overwritten}
                <span className={styles.statUnit}>{copy.unitDay}</span>
              </span>
              <span className={styles.statLabel}>{copy.overwritten}</span>
            </p>
            <p className={styles.statTile}>
              <span className={styles.statValue}>
                {loaded.preview.kept}
                <span className={styles.statUnit}>{copy.unitDay}</span>
              </span>
              <span className={styles.statLabel}>{copy.kept}</span>
            </p>
          </div>
          <p className={styles.emptySmall}>{copy.previewNote}</p>
          {loaded.preview.dropped > 0 ? (
            <p className={styles.emptySmall}>{fill(copy.droppedNote, { n: loaded.preview.dropped })}</p>
          ) : null}
          <p className={styles.emptySmall}>{copy.beforeApply}</p>
          <div className={styles.dataActions}>
            <button type="button" className={styles.planAddButton} onClick={onApply} disabled={busy}>
              {busy ? copy.applying : copy.apply}
            </button>
            <button type="button" className={styles.chip} onClick={() => setLoaded(null)} disabled={busy}>
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {/* 🔴 전체 삭제는 허브에 두지 않는다 — 이 시트 안에서, 두 단계 확인 뒤에만 열린다. */}
      {hasRecords ? (
        dangerOpen ? (
          <div className={styles.dangerBox}>
            <p className={styles.cardTitle}>{copy.dangerTitle}</p>
            <p className={styles.emptySmall}>{fill(copy.dangerBody, held)}</p>
            <label className={styles.fieldLabel} htmlFor="diary-danger-word">
              {copy.dangerHint}
            </label>
            <input
              id="diary-danger-word"
              className={styles.input}
              type="text"
              value={dangerWord}
              onChange={(event) => setDangerWord(event.target.value)}
              autoComplete="off"
            />
            <div className={styles.dataActions}>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={onClear}
                disabled={dangerWord.trim() !== copy.dangerWord}
              >
                {copy.dangerConfirm}
              </button>
              <button
                type="button"
                className={styles.chip}
                onClick={() => {
                  setDangerOpen(false);
                  setDangerWord("");
                }}
              >
                {copy.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.dataActions}>
            <button type="button" className={styles.chip} onClick={() => setDangerOpen(true)}>
              {copy.dangerOpen}
            </button>
          </div>
        )
      ) : (
        <p className={styles.emptySmall}>{copy.empty}</p>
      )}
    </section>
  );
}
