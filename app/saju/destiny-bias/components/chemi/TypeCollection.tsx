"use client";

import { CHEMI_TYPES, type ChemiTypeId } from "@/lib/idol-chemi";
import { TYPE_ACCENT, typeSymbolSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

type Props = {
  collected: Set<ChemiTypeId>;
  currentTypeId?: ChemiTypeId | null;
};

/** 9유형 수집 현황. 이 기기의 최근 결과에서 파생(로그인 컬렉션은 후속). */
export default function TypeCollection({ collected, currentTypeId }: Props) {
  return (
    <section className={styles.collection} aria-labelledby="dbk-collection-title">
      <h3 id="dbk-collection-title" className={styles.sectionTitle}>
        케미 유형 수집 <small>{collected.size} / {CHEMI_TYPES.length}</small>
      </h3>
      <ul className={styles.collectionGrid}>
        {CHEMI_TYPES.map((t) => {
          const owned = collected.has(t.id);
          return (
            <li
              key={t.id}
              className={`${styles.collectionCell} ${owned ? styles.collectionOwned : ""} ${currentTypeId === t.id ? styles.collectionCurrent : ""}`}
              data-accent={TYPE_ACCENT[t.id]}
            >
              <img src={typeSymbolSrc(t.id)} alt="" width={44} height={44} loading="lazy" decoding="async" aria-hidden />
              <span>{owned ? t.shortKo : "???"}</span>
              <span className="sr-only">{owned ? `${t.nameKo} 수집함` : "미수집 유형"}</span>
            </li>
          );
        })}
      </ul>
      <p className={styles.helpText}>다른 최애·다른 멤버와 비교하면 새 유형이 열려요.</p>
    </section>
  );
}
