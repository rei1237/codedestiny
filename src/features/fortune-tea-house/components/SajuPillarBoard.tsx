"use client";

import type { FortuneTeaSajuPillar } from "../data/consult";
import styles from "../styles/fortune-tea-house.module.css";

type SajuPillarBoardProps = {
  pillars?: FortuneTeaSajuPillar[];
};

const fallbackPillars: FortuneTeaSajuPillar[] = [
  { key: "year", label: "년주", available: false },
  { key: "month", label: "월주", available: false },
  { key: "day", label: "일주", available: false },
  {
    key: "hour",
    label: "시주",
    available: false,
    note: "출생시간을 몰라도 괜찮아요. 이번 상담에서는 시주 없이 큰 흐름을 중심으로 읽습니다.",
  },
];

export default function SajuPillarBoard({ pillars }: SajuPillarBoardProps) {
  const visiblePillars = pillars?.length ? pillars : fallbackPillars;

  return (
    <section className={styles.sajuPanelSection} aria-labelledby="sajuPillarBoardTitle">
      <div className={styles.sajuPanelSectionHeader}>
        <span>달빛이 비친 명식표</span>
        <h4 id="sajuPillarBoardTitle">달빛 네 기둥</h4>
      </div>
      <div className={styles.sajuPillarBoard}>
        {visiblePillars.map((pillar) => (
          <article
            className={styles.sajuPillarCard}
            data-primary={pillar.key === "day" ? "true" : "false"}
            data-available={pillar.available ? "true" : "false"}
            key={pillar.key}
          >
            <div className={styles.sajuPillarTop}>
              <span>{pillar.label}</span>
              <strong>{pillar.ganji || "미입력"}</strong>
            </div>
            <dl className={styles.sajuPillarRows}>
              <div>
                <dt>천간</dt>
                <dd>{pillar.heavenlyStem || "—"}</dd>
              </div>
              <div>
                <dt>지지</dt>
                <dd>{pillar.earthlyBranch || "—"}</dd>
              </div>
              <div>
                <dt>오행</dt>
                <dd>{pillar.element || "—"}</dd>
              </div>
              <div>
                <dt>십성</dt>
                <dd>{pillar.tenGod || "대표 손님과 함께 봐요"}</dd>
              </div>
            </dl>
            {!pillar.available && pillar.note ? <p>{pillar.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
