/* eslint-disable @next/next/no-img-element */
import ConsultationScene from "@/app/components/expert-consulting/ConsultationScene";
import styles from "../styles/tea-brewing.module.css";

export default function YeoniWaitingPortrait({ label, complete = false }: { label: string; complete?: boolean }) {
  if (!complete) return <ConsultationScene poster="/images/fortune-tea-house/renewal/yeoni-room-poster.webp" clip="/images/fortune-tea-house/renewal/yeoni-tea-loop.mp4" loop/>;
  return <div className={styles.portrait} data-tea-action={"offering"}>
    <img className={styles.roomPoster} alt={label} decoding="async"
      width={480} height={480}
      src="/images/fortune-tea-house/renewal/state-completed.webp" />
  </div>;
}
