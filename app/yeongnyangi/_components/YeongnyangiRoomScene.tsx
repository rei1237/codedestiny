import EntryOrnament from "@/app/components/service-intro/EntryOrnament";
import type { DomainId } from "@/worker/yeongnyangi/fortune/shared/contracts";
import styles from "@/app/components/expert-consulting/ConsultationScene.module.css";
import ConsultationScene from "@/app/components/expert-consulting/ConsultationScene";

export default function YeongnyangiRoomScene({ domain, shot = "wait" }: {
  domain: DomainId | "fusion"; shot?: "intro" | "wait" | "complete";
}) {

  const base = `/assets/yeongnyangi/readings/${domain}-room`;
  return <div className={styles.roomFrame} data-shot={shot}>
    <ConsultationScene priority={shot === "intro"} key={base} poster={base + ".webp"}
      clip={base + ".mp4" + (shot === "complete" ? "#t=3,8" : shot === "intro" ? "#t=0,6" : "")} loop={shot === "wait"}/>
    {shot === "intro" && <EntryOrnament fish />}
  </div>;
}
