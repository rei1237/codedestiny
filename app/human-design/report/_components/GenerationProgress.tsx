"use client";

// 생성 화면.
//
// 🔴 18장 목차를 **처음부터 전부** 보여 주고 상태만 칠한다. 다 끝날 때까지 백지로 기다리게
//    하면 4~5분을 견딜 이유가 없다. 완성된 장은 이 화면 아래에서 그 자리에서 열린다.
// 🔴 가짜 퍼센트를 만들지 않는다. 보여 주는 것은 실제로 완성된 장 수와 실측 경과 시간뿐이다.

import { say } from "../_lib/copy";
import type { ReportLocale, ReportPlanEntry } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  entries: ReportPlanEntry[];
  completedKeys: Set<string>;
  total: number;
  elapsedMs: number;
  locale: ReportLocale;
};

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function GenerationProgress({ entries, completedKeys, total, elapsedMs, locale }: Props) {
  const completed = completedKeys.size;
  const denominator = total || entries.length || 0;

  return (
    <section className={styles.progress} aria-live="polite" aria-busy="true">
      <header className={styles.progressHead}>
        <h2 className={styles.progressTitle}>{say("generating", locale)}</h2>
        <p className={styles.progressCount}>
          <strong>{completed}</strong>
          <span aria-hidden="true"> / </span>
          <span>{denominator}</span>
          <span className={styles.progressUnit}>{say("chapterProgress", locale)}</span>
        </p>
        <p className={styles.progressElapsed}>
          {say("elapsed", locale)} <time>{formatElapsed(elapsedMs)}</time>
        </p>
      </header>
      <p className={styles.progressNote}>{say("generatingNote", locale)}</p>
      <ol className={styles.progressList}>
        {entries.map((entry) => {
          const done = completedKeys.has(entry.key);
          return (
            <li key={entry.key} className={styles.progressItem} data-done={done ? "true" : undefined}>
              <span className={styles.progressOrder} aria-hidden="true">{String(entry.order).padStart(2, "0")}</span>
              <span className={styles.progressLabel}>{entry.title}</span>
              <span className={styles.progressState}>
                {done ? say("statusDone", locale) : say("statusPending", locale)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
