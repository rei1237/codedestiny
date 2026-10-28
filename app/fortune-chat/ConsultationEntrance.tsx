import YeoniWelcome from "./YeoniWelcome";
import styles from "./yeoni-salon.module.css";

/** Shared initial paint for both entry URLs and saved-consultation recovery. */
export default function ConsultationEntrance() {
  return <div className={styles.loading} aria-busy="true">
    <YeoniWelcome compact />
    <p role="status">연이가 상담할 자리를 준비하고 있어요.</p>
  </div>;
}
