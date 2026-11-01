import styles from "./yeoni-salon.module.css";
import {YEONI_GUIDE_ART} from '@/lib/brand/yeoni-guide-art';

/** Artwork stays separate from accessible, responsive UI text. */
export default function YeoniWelcome({ compact = false }: { compact?: boolean }) {
  return <section className={`${styles.welcome} ${compact ? styles.compact : ""}`} aria-labelledby="yeoni-welcome-title">
    {/* The original art remains the fallback; these are resize-only variants. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img {...YEONI_GUIDE_ART.welcome} alt={YEONI_GUIDE_ART.welcome.alt} srcSet="/images/fortune-chat/yeoni/salon-welcome-v1-640.webp 640w, /images/fortune-chat/yeoni/salon-welcome-v1-960.webp 960w, /images/fortune-chat/yeoni/salon-welcome-v1.webp 1440w" loading="eager" fetchPriority="high" decoding="async" sizes="(max-width: 700px) 100vw, 1040px" className={styles.scene} />
    <div className={styles.welcomeCopy}>
      <h1 id="yeoni-welcome-title">마음에 남은 이야기,<br />여기서 시작해요.</h1>
      <p>답을 서두르지 않고,<br />지금의 흐름과 다음 선택을 함께 살펴요.</p>
    </div>
  </section>;
}
