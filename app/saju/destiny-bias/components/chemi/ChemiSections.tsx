"use client";

import type { ChemiCopy } from "@/lib/idol-chemi";
import styles from "../../destiny-bias.module.css";
import art from "../../stage-art.module.css";

type Props = {
  copy: ChemiCopy;
};

/** 결과 상세: 케미 포인트 3 · 상상 장면(라벨) · 티키타카 주의 구간 · 오늘의 덕질 한 줄 · 고지. */
export default function ChemiSections({ copy }: Props) {
  return (
    <div className={styles.sections}>
      <div className={`${art.band} ${art.bandBackstage}`} aria-hidden>
        <p className={art.bandLabel}>
          After the show
          <b>Chemi report</b>
        </p>
      </div>
      <section className={styles.sectionCard} aria-labelledby="dbk-points-title">
        <h3 id="dbk-points-title" className={styles.sectionTitle}>케미 포인트</h3>
        <ol className={styles.pointList}>
          {copy.points.map((p) => (
            <li key={p.label} className={styles.pointItem}>
              <span className={styles.pointLabel}>{p.label}</span>
              <p className={styles.pointText}>{p.text}</p>
              <p className={styles.pointEvidence}>
                <span>근거</span> {p.evidenceKo}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.sectionCard} ${styles.scenarioCard}`} aria-labelledby="dbk-scenario-title">
        <p className={styles.scenarioTag}>{copy.scenario.label} · 상상 시나리오</p>
        <h3 id="dbk-scenario-title" className={styles.sectionTitle}>{copy.scenario.setting}</h3>
        <p className={styles.scenarioText}>{copy.scenario.text}</p>
      </section>

      <section className={styles.sectionCard} aria-labelledby="dbk-caution-title">
        <h3 id="dbk-caution-title" className={styles.sectionTitle}>{copy.caution.label}</h3>
        <p className={styles.sectionBody}>{copy.caution.text}</p>
        <p className={styles.pointEvidence}>
          <span>근거</span> {copy.caution.evidenceKo}
        </p>
      </section>

      <section className={`${styles.sectionCard} ${styles.finishCard}`} aria-labelledby="dbk-finish-title">
        <h3 id="dbk-finish-title" className={styles.sectionTitle}>{copy.finish.label}</h3>
        <p className={styles.finishText}>{copy.finish.text}</p>
      </section>

      <ul className={styles.noticeList} aria-label="안내">
        {copy.notices.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
