"use client";

import { diaryFlowCopy } from "../_lib/flow-copy";
import { useDiaryToday } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ① 오늘의 흐름. 운기 표면은 `lib/diary/fortune-adapter.ts` 하나뿐이고, 이 카드는
 * 그 판정을 **표시만** 한다.
 *
 * 🔴 운기가 결과를 정한다고 쓰지 않는다 — 등급은 「센 · 순한 · 고른 · 더딘 · 잠긴 결」로
 * **세기**를 말하고, 문안 규칙은 `../_lib/flow-copy.ts` 에 있다.
 */

const DIARY_FLOW_CARD_TEXT = {
  ko: {
    title: "오늘의 흐름",
    loading: "오늘의 결을 불러오는 중입니다.",
    noProfile: "생년월일을 등록하면 오늘의 결이 여기에 표시됩니다.",
    stability: "안정",
    flow: "흐름",
    care: "주의",
    suggest: "추천",
    detail: "자세히 보기",
    pending: "준비 중입니다",
  },
  en: {
    title: "Today's flow",
    loading: "Loading today's grain.",
    noProfile: "Register a birth date and today's grain will appear here.",
    stability: "Stability",
    flow: "Flow",
    care: "Care",
    suggest: "Try",
    detail: "See details",
    pending: "Coming soon",
  },
} as const;

const copy = DIARY_FLOW_CARD_TEXT.ko;

export default function DiaryFlowCard() {
  const { hydrated, fortune } = useDiaryToday();
  const flow = diaryFlowCopy(fortune?.tone);

  return (
    <section className={`${styles.card} ${styles.cardLead}`} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
      </header>

      {!hydrated ? <p className={styles.empty}>{copy.loading}</p> : null}
      {hydrated && !flow ? <p className={styles.empty}>{copy.noProfile}</p> : null}

      {hydrated && flow ? (
        <>
          <p className={`${styles.grain} ${styles[flow.step]}`}>
            <span className={styles.grainDot} aria-hidden="true" />
            <span className={styles.grainName}>{flow.name}</span>
            <span className={styles.grainScore}>
              {copy.stability} {fortune?.goodness ?? "—"}
            </span>
          </p>
          <ul className={styles.flowList}>
            <li>
              <span className={styles.flowKey}>{copy.flow}</span>
              <span className={styles.flowValue}>{flow.flow}</span>
            </li>
            <li>
              <span className={styles.flowKey}>{copy.care}</span>
              <span className={`${styles.flowValue} ${styles.flowCare}`}>{flow.care}</span>
            </li>
            <li>
              <span className={styles.flowKey}>{copy.suggest}</span>
              <span className={styles.flowValue}>{flow.suggest}</span>
            </li>
          </ul>
          <div className={styles.chipRow}>
            {/* 접힌 근거는 PR-D 의 Day View 와 같은 조립을 쓴다. 그전까지는 열지 않는다. */}
            <button
              type="button"
              className={styles.chip}
              disabled
              aria-disabled="true"
              title={`${copy.detail} — ${copy.pending}`}
            >
              {copy.detail}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
