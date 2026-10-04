"use client";

import { useMemo } from "react";
import { listGroupMembers, type ChemiPartnerRecord } from "@/lib/idol-chemi";
import styles from "../../destiny-bias.module.css";

type Props = {
  current: ChemiPartnerRecord;
  onSwitch: (partner: ChemiPartnerRecord) => void;
};

/** 같은 그룹 다른 멤버로 즉시 재계산. 로스터 파트너일 때만 렌더된다. */
export default function MemberSwitcher({ current, onSwitch }: Props) {
  const others = useMemo(
    () => (current.groupId ? listGroupMembers(current.groupId).filter((m) => m.id !== current.id) : []),
    [current.groupId, current.id],
  );
  if (!others.length) return null;
  return (
    <section className={styles.switcher} aria-labelledby="dbk-switcher-title">
      <h3 id="dbk-switcher-title" className={styles.sectionTitle}>
        {current.groupLabel} 다른 멤버와는?
      </h3>
      <div className={styles.chipRow}>
        {others.map((m) => (
          <button key={m.id} type="button" className={styles.chip} onClick={() => onSwitch(m)}>
            {m.displayName}
          </button>
        ))}
      </div>
    </section>
  );
}
