"use client";

import { CHEMI_TYPE_BY_ID, type ChemiPartnerRef } from "@/lib/idol-chemi";
import ChemiTypeBadge from "./ChemiTypeBadge";
import type { RecentResultEntry } from "./chemiStorage";
import styles from "../../destiny-bias.module.css";

type Props = {
  items: RecentResultEntry[];
  onReplay: (ref: ChemiPartnerRef) => void;
};

/** 이 기기에서 본 최근 결과(유형·한 줄만 저장, 생일 없음). 다시 보기는 생일 재입력 없이 즉시 재계산. */
export default function RecentResults({ items, onReplay }: Props) {
  if (!items.length) return null;
  return (
    <section className={styles.recentResults} aria-labelledby="dbk-recent-title">
      <h3 id="dbk-recent-title" className={styles.sectionTitle}>최근 본 케미</h3>
      <ul className={styles.recentList}>
        {items.slice(0, 6).map((item) => {
          const meta = CHEMI_TYPE_BY_ID[item.chemiTypeId];
          return (
            <li key={`${item.partner.kind}:${item.partner.id}`}>
              <button type="button" className={styles.recentItem} onClick={() => onReplay(item.partner)}>
                <ChemiTypeBadge typeId={item.chemiTypeId} nameKo={meta?.nameKo || item.chemiTypeNameKo} shortKo={meta?.shortKo || ""} size="sm" />
                <span className={styles.recentMeta}>
                  <strong>{item.partnerName}</strong>
                  <small>{item.groupLabel}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
