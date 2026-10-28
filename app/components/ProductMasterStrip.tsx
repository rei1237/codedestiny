import styles from "./product-master-strip.module.css";

export type ProductMaster = { name: string; role: string; avatar: string; line: string };

/**
 * 대표 상담 히어로의 마스터 띠 — 아바타·이름·역할과 캐릭터 말투 한 줄.
 * 색은 페이지 토큰(--pe-*)을 따르고, 없으면 글자색에서 파생한다. 애니메이션 없음.
 */
export default function ProductMasterStrip({ label, masters, profileHref }: { label: string; masters: ProductMaster[]; profileHref?: string }) {
  return (
    <div className={styles.strip} role="group" aria-label={label} data-count={masters.length}>
      <p className={styles.label}>{label}</p>
      <ul className={styles.list}>
        {masters.map((master) => (
          <li key={master.name} className={styles.master}>
            <img className={styles.avatar} src={master.avatar} alt="" width={56} height={56} decoding="async" />
            <div className={styles.copy}>
              <p className={styles.name}>{master.name} <span>{master.role}</span></p>
              <p className={styles.line}>“{master.line}”</p>
            </div>
          </li>
        ))}
      </ul>
      {profileHref && <a className={styles.more} href={profileHref}>마스터 소개 보기 <span aria-hidden="true">↓</span></a>}
    </div>
  );
}
