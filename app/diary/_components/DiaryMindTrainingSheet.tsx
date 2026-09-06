"use client";

import { useEffect, useState } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import {
  completeIam,
  completeRevision,
  completeSats,
  pickIamAffirmation,
  pickSatsScene,
  writeIamAffirmation,
  writeRevision,
  writeSatsScene,
} from "../_lib/entry-writes";
import {
  pickTrainingAffirmation,
  pickTrainingScene,
  trainingKeywordOf,
} from "../_lib/mind-training-pool";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 마음 훈련 시트 — 장면 그리기 · 다시 쓰기 · 한 문장.
 *
 * 🔴 세 칸 모두 **셸 모달과 같은 v2 필드**에 쓴다(`../_lib/entry-writes.ts`). 그래서 셸에서 적던
 * 사람이 앱으로 넘어와도 오늘 적어 둔 것이 그대로 보인다.
 * 🔴 글은 저장 버튼 없이 멈추면 저장한다(`useDiaryDraft`) — 이 앱의 다른 입력 칸과 같은 규칙이다.
 * 🔴 문안 풀의 키워드는 계열에서 온다(`../_lib/mind-training-pool.ts`) — 새 판정을 만들지 않는다.
 */

const DIARY_TRAINING_TEXT = {
  ko: {
    title: "마음 훈련",
    close: "닫기",
    tabScene: "장면 그리기",
    tabRevision: "다시 쓰기",
    tabIam: "한 문장",
    keyword: "오늘의 키워드",
    scene: "떠올릴 장면",
    scenePlaceholder: "장면을 뽑거나 직접 적어 보세요",
    pickScene: "다른 장면 뽑기",
    doneScene: "떠올렸어요",
    doneSceneOn: "오늘 떠올렸습니다",
    original: "있었던 일",
    originalPlaceholder: "마음에 남은 장면을 적어 보세요",
    imagined: "다시 쓴 장면",
    imaginedPlaceholder: "그 장면이 어떻게 끝났으면 좋았을지 적어 보세요",
    doneRevision: "한 번 담기",
    revisionCount: "오늘 담은 횟수",
    times: "번",
    affirmation: "오늘의 한 문장",
    affirmationPlaceholder: "문장을 뽑거나 직접 적어 보세요",
    pickAffirmation: "다른 문장 뽑기",
    doneIam: "오늘의 문장으로 담기",
    doneIamOn: "오늘의 문장으로 담았습니다",
    empty: "오늘의 기록을 불러오는 중입니다.",
  },
  en: {
    title: "Mind practice",
    close: "Close",
    tabScene: "Picture it",
    tabRevision: "Rewrite it",
    tabIam: "One line",
    keyword: "Today's keyword",
    scene: "Scene to picture",
    scenePlaceholder: "Draw a scene or write your own",
    pickScene: "Draw another scene",
    doneScene: "Pictured it",
    doneSceneOn: "Pictured today",
    original: "What happened",
    originalPlaceholder: "Write the scene that stayed with you",
    imagined: "Rewritten scene",
    imaginedPlaceholder: "Write how you wish it had ended",
    doneRevision: "Save one round",
    revisionCount: "Rounds today",
    times: "x",
    affirmation: "One line for today",
    affirmationPlaceholder: "Draw a line or write your own",
    pickAffirmation: "Draw another line",
    doneIam: "Keep as today's line",
    doneIamOn: "Kept as today's line",
    empty: "Loading today's entry.",
  },
} as const;

const copy = DIARY_TRAINING_TEXT.ko;

type DiaryTrainingTab = "scene" | "revision" | "iam";

export default function DiaryMindTrainingSheet({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, entry, chart } = useDiaryToday();
  const { updateEntry } = useDiaryWriter();
  const [tab, setTab] = useState<DiaryTrainingTab>("scene");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const keyword = trainingKeywordOf(dayGroupOf(chart, ymd));

  const scene = useDiaryDraft(entry?.satsScene || "", (next) => {
    updateEntry(ymd, writeSatsScene(next));
  });
  const original = useDiaryDraft(entry?.revisionOriginal || "", (next) => {
    updateEntry(ymd, writeRevision("original", next));
  });
  const imagined = useDiaryDraft(entry?.revisionImagined || "", (next) => {
    updateEntry(ymd, writeRevision("imagined", next));
  });
  const affirmation = useDiaryDraft(entry?.iAmAffirmation || "", (next) => {
    updateEntry(ymd, writeIamAffirmation(next));
  });

  const revisionCount = Number(entry?.revisionDoneCount) || 0;

  const onPickScene = () => {
    const picked = pickTrainingScene(keyword, Number(entry?.satsSceneLastIndex ?? -1));
    scene.flush();
    updateEntry(ymd, pickSatsScene(keyword, picked.text, picked.index));
  };

  const onPickAffirmation = () => {
    const picked = pickTrainingAffirmation(keyword, Number(entry?.iAmLastIndex ?? -1));
    affirmation.flush();
    updateEntry(ymd, pickIamAffirmation(picked.text, picked.index));
  };

  const tabs: { key: DiaryTrainingTab; label: string }[] = [
    { key: "scene", label: copy.tabScene },
    { key: "revision", label: copy.tabRevision },
    { key: "iam", label: copy.tabIam },
  ];

  return (
    <aside className={styles.sheet} aria-label={copy.title}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>{copy.title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
          ✕
        </button>
      </header>

      <div className={styles.chipRow}>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? styles.rangeChipOn : styles.rangeChip}
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!hydrated || !ymd ? <p className={styles.empty}>{copy.empty}</p> : null}

      {hydrated && ymd && tab === "scene" ? (
        <>
          <p className={styles.fieldLabel}>
            {copy.keyword}
            <span className={styles.fieldHint}>{keyword}</span>
          </p>
          <textarea
            className={styles.textarea}
            value={scene.value}
            onChange={(event) => scene.onChange(event.target.value)}
            onBlur={scene.flush}
            placeholder={copy.scenePlaceholder}
            aria-label={copy.scene}
          />
          <div className={styles.chipRow}>
            <button type="button" className={styles.chip} onClick={onPickScene}>
              {copy.pickScene}
            </button>
            <button
              type="button"
              className={styles.chip}
              onClick={() => {
                scene.flush();
                updateEntry(ymd, completeSats());
              }}
            >
              {copy.doneScene}
            </button>
          </div>
          {entry?.satsCompleted ? <p className={styles.emptySmall}>{copy.doneSceneOn}</p> : null}
        </>
      ) : null}

      {hydrated && ymd && tab === "revision" ? (
        <>
          <p className={styles.fieldLabel}>{copy.original}</p>
          <textarea
            className={styles.textarea}
            value={original.value}
            onChange={(event) => original.onChange(event.target.value)}
            onBlur={original.flush}
            placeholder={copy.originalPlaceholder}
            aria-label={copy.original}
          />
          <p className={styles.fieldLabel}>{copy.imagined}</p>
          <textarea
            className={styles.textarea}
            value={imagined.value}
            onChange={(event) => imagined.onChange(event.target.value)}
            onBlur={imagined.flush}
            placeholder={copy.imaginedPlaceholder}
            aria-label={copy.imagined}
          />
          <div className={styles.chipRow}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => {
                original.flush();
                imagined.flush();
                updateEntry(ymd, completeRevision());
              }}
            >
              {copy.doneRevision}
            </button>
          </div>
          <p className={styles.emptySmall}>
            {copy.revisionCount} {revisionCount}
            {copy.times}
          </p>
        </>
      ) : null}

      {hydrated && ymd && tab === "iam" ? (
        <>
          <p className={styles.fieldLabel}>{copy.affirmation}</p>
          <textarea
            className={styles.textarea}
            value={affirmation.value}
            onChange={(event) => affirmation.onChange(event.target.value)}
            onBlur={affirmation.flush}
            placeholder={copy.affirmationPlaceholder}
            aria-label={copy.affirmation}
          />
          <div className={styles.chipRow}>
            <button type="button" className={styles.chip} onClick={onPickAffirmation}>
              {copy.pickAffirmation}
            </button>
            {/* 🔴 받아쓰기를 시키지 않는다 — 자기 문장 그대로 담을 수 있다(`completeIam` 주석). */}
            <button
              type="button"
              className={styles.chip}
              disabled={!affirmation.value.trim()}
              onClick={() => updateEntry(ymd, completeIam(affirmation.value.trim()))}
            >
              {copy.doneIam}
            </button>
          </div>
          {entry?.iAmCompleted ? <p className={styles.emptySmall}>{copy.doneIamOn}</p> : null}
        </>
      ) : null}
    </aside>
  );
}
