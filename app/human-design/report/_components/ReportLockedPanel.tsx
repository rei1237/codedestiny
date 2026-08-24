"use client";

// 결제 전 화면.
//
// 🔴 **본문을 DOM 에 렌더하지 않는다.** 블러로 덮는 방식은 소스 보기 한 번이면 그대로 읽히므로
//    잠금이 아니다. 여기 있는 것은 표지 · 18장 목차 · 무료 차트에서 나온 확정값뿐이고,
//    한 문장도 모델이 쓴 글이 아니다.
//
// 🔴 결제는 ensurePaidAccess **하나**로만 연다. 진입 시 서버 이용권 선검사를 되살리지 않는다
//    (docs/context/payment-gating.md 의 절대 순서 1번).

import type { Locale as ViewerLocale } from "@/app/human-design/_copy";
import { say } from "../_lib/copy";
import type { ReportPlanEntry } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  /** 🔴 화면 크롬의 언어(다섯). 본문 언어와 다른 축이다 — 본문은 bodyLocale/ReportLocale 을 받는다. */
  locale: ViewerLocale;
  facts: Array<{ label: string; value: string }>;
  contents: ReportPlanEntry[];
  busy: boolean;
  error: string;
  onPurchase: () => void;
};

export default function ReportLockedPanel({ locale, facts, contents, busy, error, onPurchase }: Props) {
  return (
    <section className={styles.locked}>
      <header className={styles.lockedHead}>
        <span className={styles.lockedKicker}>{say("lockedKicker", locale)}</span>
        <h1 className={styles.lockedTitle}>{say("lockedHeading", locale)}</h1>
        <p className={styles.lockedBody}>{say("lockedBody", locale)}</p>
      </header>

      {facts.length > 0 && (
        <dl className={styles.lockedFacts}>
          {facts.map((fact) => (
            <div className={styles.lockedFact} key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className={styles.lockedContents}>
        <p className={styles.lockedContentsTitle}>{say("lockedContents", locale)}</p>
        <ol className={styles.lockedList}>
          {contents.map((entry) => (
            <li key={entry.key}>
              <span className={styles.lockedOrder} aria-hidden="true">{String(entry.order).padStart(2, "0")}</span>
              <span>{entry.title}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button type="button" className={styles.buyButton} onClick={onPurchase} disabled={busy}>
        {busy ? say("buying", locale) : say("buy", locale)}
      </button>
    </section>
  );
}
