import Image from "next/image";
import styles from "./yeoni-salon.module.css";

/** Artwork stays separate from accessible, responsive UI text. */
export default function YeoniWelcome({ compact = false }: { compact?: boolean }) {
  return <section className={`${styles.welcome} ${compact ? styles.compact : ""}`} aria-labelledby="yeoni-welcome-title">
    <Image src="/images/service-introductions/fortune-chat-yeoni.webp" alt="꽃이 핀 찻집에서 당신의 이야기를 기다리는 인간형 연이와 꽃돼지 연이" width={1536} height={1024} priority sizes="(max-width: 700px) 100vw, 1040px" className={styles.scene} />
    <div className={styles.welcomeCopy}>
      <h1 id="yeoni-welcome-title">마음에 남은 이야기,<br />여기서 시작해요.</h1>
      <p>답을 서두르지 않고,<br />지금의 흐름과 다음 선택을 함께 살펴요.</p>
    </div>
  </section>;
}
