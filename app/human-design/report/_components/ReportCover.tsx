"use client";

// 리포트 표지.
//
// 🔴 생년월일·생시·이름을 싣지 않는다. 리포트는 공유되기 쉬운 물건이고, PDF 표지·파일명도
//    같은 선을 쓴다(초융합 PDF 의 프라이버시 경계와 동일). 표지가 갖는 것은 차트에서 나온
//    확정값뿐이다.
// 🔴 문구를 만들지 않는다 — 표지 텍스트도 플랜의 cover 에서 온다.

import { say } from "../_lib/copy";
import type { ReportLocale, ReportPlan } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  cover: ReportPlan["cover"];
  stats: ReportPlan["stats"];
  locale: ReportLocale;
  bodyLocale: ReportLocale;
};

export default function ReportCover({ cover, stats, locale, bodyLocale }: Props) {
  return (
    <header className={styles.cover}>
      <p className={styles.coverSubtitle}>{cover.subtitle}</p>
      <h1 className={styles.coverTitle}>{cover.title}</h1>

      <dl className={styles.coverFacts}>
        {cover.facts.map((fact) => (
          <div className={styles.coverFact} key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <dl className={styles.coverMeta} aria-label={say("reportMeta", locale)}>
        <div className={styles.coverMetaRow}>
          <dt>{say("metaChapters", locale)}</dt>
          <dd>{stats.chapters}{say("chaptersUnit", locale)}</dd>
        </div>
        <div className={styles.coverMetaRow}>
          <dt>{say("metaChars", locale)}</dt>
          <dd>{stats.chars.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}{say("charsUnit", locale)}</dd>
        </div>
        <div className={styles.coverMetaRow}>
          <dt>{say("metaLocale", locale)}</dt>
          <dd>{bodyLocale.toUpperCase()}</dd>
        </div>
      </dl>
    </header>
  );
}
