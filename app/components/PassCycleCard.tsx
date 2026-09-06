import styles from "./PassCycleCard.module.css";

export type PassCycleCardCopy = {
  ariaLabel: string;
  title: string;
  tierLabel: string;
  summary: (spent: string, cap: string) => string;
  remaining: (value: string) => string;
};

type PassCycleCardProps = {
  tier: string;
  capWon: number;
  spentWon: number;
  remainingWon: number;
  percent: number;
  copy: PassCycleCardCopy;
  formatWon: (value: number) => string;
};

const TIER_CLASS: Record<string, string> = {
  standard: styles.standard,
  premium: styles.premium,
  vvip: styles.vvip,
  family: styles.family,
};

export default function PassCycleCard({
  tier,
  capWon,
  spentWon,
  remainingWon,
  percent,
  copy,
  formatWon,
}: PassCycleCardProps) {
  const theme = TIER_CLASS[tier] || styles.standard;
  return (
    <section aria-label={copy.ariaLabel} className={`${styles.card} ${theme}`}>
      <div className={styles.header}>
        <p className={styles.label}>{copy.title}</p>
        <span className={styles.tier}>{copy.tierLabel}</span>
      </div>
      <p className={styles.amounts}>
        {copy.summary(formatWon(spentWon), formatWon(capWon))}
      </p>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <p className={styles.remaining}>{copy.remaining(formatWon(remainingWon))}</p>
    </section>
  );
}
