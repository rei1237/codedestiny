"use client";

// 생성 화면.
//
// 🔴 18장 목차를 **처음부터 전부** 보여 주고 상태만 칠한다. 다 끝날 때까지 백지로 기다리게
//    하면 4~5분을 견딜 이유가 없다. 완성된 장은 이 화면 아래에서 그 자리에서 열린다.
// 🔴 가짜 퍼센트를 만들지 않는다. 보여 주는 것은 실제로 완성된 장 수와 실측 경과 시간뿐이다.
// 🔴 "작성 중" 은 시간이 아니라 **서버 계약**에서 나온다. handleGenerate 는 pending 을 order
//    순으로 HD_REPORT_SECTION_CONCURRENCY 개만 집으므로, 아직 안 끝난 것 중 **앞의 그만큼**이
//    지금 실제로 쓰이고 있는 장이다. 경과 시간으로 칠하면 그건 지어낸 진행률이다
//    (worker/routes/human-design.js 의 요구사항 22 · PipelineScene · AnalysisBasisLoading 과 같은 계약).
// 🔴 배경 애니메이션은 무료 차트 대기 화면의 PipelineField 를 그대로 재사용한다 — 같은 그림을
//    두 벌 저작하면 한쪽만 바뀐다.

import { PipelineField } from "@/app/human-design/_components/PipelineScene";
import type { Locale as ViewerLocale } from "@/app/human-design/_copy";
import { say } from "../_lib/copy";
import type { ReportPlanEntry } from "../_lib/types";
import styles from "../report.module.css";
import scene from "./generation-scene.module.css";

/**
 * 🔴 서버가 한 웨이브에서 동시에 집는 장 수. worker/lib/human-design-report-contract.js 의
 *    HD_REPORT_SECTION_CONCURRENCY 와 **같아야** 하고, 그 정합은
 *    scripts/verify-human-design-report.mjs 가 숫자로 대조한다(문자열 검사가 아니다).
 *    이 값이 서버보다 크면 아직 시작도 안 한 장을 "작성 중" 이라고 말하게 된다.
 */
const WRITING_WINDOW = 4;

type Props = {
  entries: ReportPlanEntry[];
  completedKeys: Set<string>;
  total: number;
  elapsedMs: number;
  /** 🔴 화면 크롬의 언어(다섯). 본문 언어와 다른 축이다 — 본문은 bodyLocale/ReportLocale 을 받는다. */
  locale: ViewerLocale;
};

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function GenerationProgress({ entries, completedKeys, total, elapsedMs, locale }: Props) {
  const completed = completedKeys.size;
  const denominator = total || entries.length || 0;

  // 아직 안 끝난 장 중 앞의 WRITING_WINDOW 개가 지금 쓰이고 있는 장이다.
  const writingKeys = new Set(
    entries.filter((entry) => !completedKeys.has(entry.key)).slice(0, WRITING_WINDOW).map((entry) => entry.key),
  );

  return (
    <section className={`${styles.progress} ${scene.scene}`} aria-live="polite" aria-busy="true">
      <PipelineField />
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
        {entries.map((entry, index) => {
          const state = completedKeys.has(entry.key)
            ? "done"
            : (writingKeys.has(entry.key) ? "writing" : "pending");
          const statusKey = state === "done" ? "statusDone" : (state === "writing" ? "statusWriting" : "statusPending");
          return (
            <li
              key={entry.key}
              className={`${styles.progressItem} ${scene.item}`}
              data-state={state}
              style={{ ["--hd-gen-i" as string]: index }}
            >
              <span className={`${styles.progressOrder} ${scene.order}`} aria-hidden="true">
                {String(entry.order).padStart(2, "0")}
              </span>
              <span className={styles.progressLabel}>{entry.title}</span>
              <span className={`${styles.progressState} ${scene.state}`}>{say(statusKey, locale)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
