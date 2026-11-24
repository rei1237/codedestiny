/* eslint-disable @next/next/no-img-element */
import ConsultationScene from "@/app/components/expert-consulting/ConsultationScene";
import styles from "../styles/tea-brewing.module.css";

import type { FortuneTeaHouseConsultMode } from "../data/consult";
export default function YeoniWaitingPortrait({ label, complete = false, mode, failed = false }: { label: string; complete?: boolean; mode?: FortuneTeaHouseConsultMode; failed?: boolean }) {
  if (failed) return <img className={styles.roomPoster} src="/images/fortune-tea-house/renewal/yeoni-room-poster.webp" alt={label} />;
  if (!complete && (mode === "saju" || mode === "sajuCompatibility")) {
    const human = mode === "sajuCompatibility";
    return <ConsultationScene poster={human ? "/images/master-profiles/yeoni-love-portrait-360.webp" : "/images/fortune-tea-house/renewal/yeoni-room-poster.webp"} clip={human ? "/images/saju/yeoni-human-analysis.mp4" : "/images/saju/yeoni-pig-analysis.mp4"} loop />;
  }
  if (!complete) return <ConsultationScene poster="/images/fortune-tea-house/renewal/yeoni-room-poster.webp" clip="/images/fortune-tea-house/renewal/yeoni-tea-loop.mp4" loop/>;
  return <div className={styles.portrait} data-tea-action={"offering"}>
    <img className={styles.roomPoster} alt={label} decoding="async"
      width={480} height={480}
      src="/images/fortune-tea-house/renewal/state-completed.webp" />
  </div>;
}
