"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaFiveElementBalance } from "../data/consult";
import styles from "../styles/fortune-tea-house.module.css";

type FiveElementBalanceProps = {
  elements?: FortuneTeaFiveElementBalance[];
};

export default function FiveElementBalance({ elements }: FiveElementBalanceProps) {
  if (!elements?.length) {
    return (
      <section className={styles.sajuPanelSection} aria-labelledby="fiveElementBalanceTitle">
        <div className={styles.sajuPanelSectionHeader}>
          <span>찻잔 향이 차오르는 결</span>
          <h4 id="fiveElementBalanceTitle">오행 향의 균형</h4>
        </div>
        <p className={styles.sajuMutedText}>출생정보가 충분하지 않아 오행의 세부 균형은 펼치지 않았어요.</p>
      </section>
    );
  }

  return (
    <section className={styles.sajuPanelSection} aria-labelledby="fiveElementBalanceTitle">
      <div className={styles.sajuPanelSectionHeader}>
        <span>찻잔 향이 차오르는 결</span>
        <h4 id="fiveElementBalanceTitle">오행 향의 균형</h4>
      </div>
      <div className={styles.fiveElementBalance}>
        {elements.map((element) => (
          <article className={styles.fiveElementItem} data-tone={element.tone} key={element.key}>
            <div className={styles.fiveElementMeta}>
              <span>{element.nameKo}</span>
              <strong>{element.strengthLabel}</strong>
              <em>{Math.round(element.value)}%</em>
            </div>
            <div className={styles.fiveElementTrack} aria-label={`${element.nameKo} ${Math.round(element.value)}%`}>
              <span style={{ "--element-value": `${element.value}%` } as CSSProperties} />
            </div>
            <p>{element.reading}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
