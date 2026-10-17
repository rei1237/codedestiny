import world from "@/src/features/fortune-tea-house/styles/tea-house-home.module.css";
import styles from "./consultation-entrance.module.css";

/** The same illustrated entrance is rendered before hydration and during route loading. */
export default function ConsultationEntrance() {
  return <div className={`${world.home} ${styles.entrance}`} aria-busy="true">
    <div className={styles.scene}>
      <svg className={styles.moon} viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
        <path d="M45 10a25 25 0 1 0 9 39A25 25 0 0 1 45 10Z" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M48 25v8m-4-4h8" stroke="currentColor" strokeWidth="1" />
      </svg>
      <img className={styles.portrait} src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" width="1536" height="1024" alt="달빛 아래에서 상담을 준비하는 연이" fetchPriority="high" />
      <h1>당신의 이야기가 머무는<br />달빛 찻집</h1>
      <p className={styles.invitation}>서두르지 않아도 괜찮아요.<br />연이가 이야기를 나눌 자리를 준비하고 있어요.</p>
      <p className={styles.status} role="status"><span aria-hidden="true" />상담실을 열고 있어요</p>
    </div>
  </div>;
}
