import type { DomainId } from "@/worker/yeongnyangi/fortune/shared/contracts";
import ConsultationScene from "@/app/components/expert-consulting/ConsultationScene";

export default function YeongnyangiRoomScene({ domain, shot = "wait" }: {
  domain: DomainId | "fusion"; shot?: "intro" | "wait" | "complete";
}) {

  const base = `/assets/yeongnyangi/readings/${domain}-room`;
  return <div style={{width:"min(100%, 32rem)", marginInline:"auto"}}>
    <ConsultationScene key={base} poster={base + ".webp"}
      clip={base + ".mp4" + (shot === "complete" ? "#t=3,8" : shot === "intro" ? "#t=0,6" : "")} loop={shot === "wait"}/>
  </div>;
}
