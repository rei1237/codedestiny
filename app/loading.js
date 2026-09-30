import Image from "next/image";
import { siteSeo } from "../lib/seo/siteSeo";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main className={styles.screen} role="status" aria-live="polite">
      <Image className={styles.art} src="/images/brand/moonlight-garden-splash-720.webp" alt="" width={720} height={1080} priority />
      <div className={styles.intro}>
        <h1>{siteSeo.brandName}</h1>
        <p>연이·네오·영냥이와 함께, 나의 흐름을 읽는 곳</p>
      </div>
      <p className={styles.message}>달빛정원을 준비하고 있어요</p>
    </main>
  );
}
