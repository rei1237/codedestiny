"use client";

import Link from "next/link";
import { useMemo } from "react";

import { buildDiaryDayDetail } from "../_lib/day-copy";
import { useDiaryToday } from "./DiaryStoreProvider";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ① 오늘의 흐름. 운기 표면은 `lib/diary/fortune-adapter.ts` 하나뿐이고, 이 카드는
 * 그 판정을 **표시만** 한다.
 *
 * 🔴 운기가 결과를 정한다고 쓰지 않는다 — 등급은 「센 · 순한 · 고른 · 더딘 · 잠긴 결」로
 * **세기**를 말하고, 문안 규칙은 `../_lib/day-copy.ts`(5×5)와 `../_lib/flow-copy.ts`(등급)에 있다.
 * 🔴 문안 조립은 Day View 와 **같은 함수**를 쓴다 — 같은 하루가 홈과 달력에서 다르게 읽히면
 * 사용자가 자기 기록과 대조할 수 없다.
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
  const { hydrated, fortune, chart, ymd } = useDiaryToday();
  const detail = useMemo(
    () => buildDiaryDayDetail(fortune, dayGroupOf(chart, ymd)),
    [fortune, chart, ymd],
  );
  const flow = detail?.grade || null;

  return (
    <section className={`${styles.card} ${styles.cardLead}`} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
      </header>

      {!hydrated ? <p className={styles.empty}>{copy.loading}</p> : null}
      {hydrated && !flow ? <p className={styles.empty}>{copy.noProfile}</p> : null}

      {hydrated && flow && detail ? (
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
              <span className={styles.flowValue}>{detail.read}</span>
            </li>
            <li>
              <span className={styles.flowKey}>{copy.care}</span>
              <span className={`${styles.flowValue} ${styles.flowCare}`}>{detail.watch}</span>
            </li>
            <li>
              <span className={styles.flowKey}>{copy.suggest}</span>
              <span className={styles.flowValue}>{detail.suggest}</span>
            </li>
          </ul>
          <div className={styles.chipRow}>
            {/* 접힌 근거는 달력의 Day View 가 같은 조립(`buildDiaryDayDetail`)으로 펼친다. */}
            <Link className={styles.chip} href={`/diary/calendar/?d=${ymd}`}>
              {copy.detail}
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
