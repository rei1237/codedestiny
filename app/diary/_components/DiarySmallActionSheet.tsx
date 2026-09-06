"use client";

import { useCallback, useEffect, useState } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { addTodo } from "../_lib/ext-writes";
import { pickSmallAction, smallActionsFor, type DiarySmallAction } from "../_lib/small-action-pool";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 오늘의 작은 행동 시트. 오늘 하루에 얹을 한 가지를 뽑고, 그대로 할 일로 담는다.
 *
 * 🔴 뽑은 결과는 저장하지 않는다 — 담아야 남는다. 뽑기만 한 것을 기록으로 남기면
 * 하지 않은 일이 오늘의 기록에 쌓인다.
 * 🔴 담는 자리는 `/diary` 확장 저장소의 할 일이다(`../_lib/ext-writes.ts`) — 셸과 공유하는
 * v2 엔트리가 아니다. 셸에는 이 목록을 읽는 화면이 없다.
 */

const DIARY_SMALL_ACTION_TEXT = {
  ko: {
    title: "오늘의 작은 행동",
    close: "닫기",
    lead: "오늘 하루에 얹을 한 가지입니다. 마음에 들지 않으면 다시 뽑아도 됩니다.",
    draw: "다시 뽑기",
    add: "할 일에 담기",
    added: "할 일에 담았습니다.",
    empty: "오늘의 기록을 불러오는 중입니다.",
  },
  en: {
    title: "One small step",
    close: "Close",
    lead: "One thing to add to today. Draw again if it doesn't fit.",
    draw: "Draw again",
    add: "Add to to-dos",
    added: "Added to your to-dos.",
    empty: "Loading today's entry.",
  },
} as const;

const copy = DIARY_SMALL_ACTION_TEXT.ko;

export default function DiarySmallActionSheet({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, chart } = useDiaryToday();
  const { updateExtDay } = useDiaryWriter();

  const [picked, setPicked] = useState<{ action: DiarySmallAction; index: number } | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /* 🔴 뽑기는 이펙트·클릭에서만 한다 — 렌더 중에 `Math.random()` 을 부르면 프리렌더된 첫
     화면과 하이드레이션 결과가 달라진다(`output:"export"`). */
  const draw = useCallback(() => {
    const pool = smallActionsFor(dayGroupOf(chart, ymd));
    setPicked((current) => pickSmallAction(pool, current ? current.index : -1));
    setAdded(false);
  }, [chart, ymd]);

  useEffect(() => {
    if (hydrated) draw();
    // 열자마자 한 장은 보여 준다. 뽑기 버튼을 눌러야 비로소 뭔가 나오는 빈 시트를 만들지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <aside className={styles.sheet} aria-label={copy.title}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>{copy.title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
          ✕
        </button>
      </header>

      <p className={styles.emptySmall}>{copy.lead}</p>

      {picked ? (
        <div className={styles.actionCard}>
          <span className={styles.actionEmoji} aria-hidden="true">
            {picked.action.emoji}
          </span>
          <span className={styles.actionName}>{picked.action.name}</span>
          <span className={styles.actionTip}>{picked.action.tip}</span>
        </div>
      ) : (
        <p className={styles.empty}>{copy.empty}</p>
      )}

      <div className={styles.chipRow}>
        <button type="button" className={styles.chip} onClick={draw}>
          {copy.draw}
        </button>
        <button
          type="button"
          className={styles.chip}
          disabled={!picked || !ymd || added}
          onClick={() => {
            if (!picked || !ymd) return;
            if (updateExtDay(ymd, addTodo(`${picked.action.emoji} ${picked.action.name}`))) {
              setAdded(true);
            }
          }}
        >
          {copy.add}
        </button>
      </div>
      {added ? (
        <p className={styles.emptySmall} role="status">
          {copy.added}
        </p>
      ) : null}
    </aside>
  );
}
