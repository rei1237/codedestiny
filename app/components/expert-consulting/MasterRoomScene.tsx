import ConsultationScene from "./ConsultationScene";

import styles from "./ConsultationScene.module.css";

export type RoomMaster = "neo" | "neo-decision" | "yun" | "musung" | "hanbi" | "human" | "codex" | "fusion" | "heukwol" | "karma" | "love";

export default function MasterRoomScene({ master, still = false, shot = "wait" }: { master: RoomMaster; still?: boolean; shot?: "intro" | "wait" | "complete" }) {
  const base = `/images/consultation-rooms/${master}`;
  const cover = base + ".webp";
  return <div className={styles.roomFrame} data-shot={shot}>
    {still ? <img src={cover} width={960} height={540} style={{width:"100%",height:"auto",borderRadius:16}} alt=""/>
     : <ConsultationScene priority={shot === "intro"} key={master} poster={cover} clip={base + ".mp4" + (shot === "complete" ? "#t=3,8" : shot === "intro" ? "#t=0,6" : "")} loop={shot === "wait"}/>}
    <img className={styles.roomPetals} src="/images/fortune-tea-house/renewal/prop-petals.webp" width={32} height={20} alt="" loading="lazy" />
  </div>;
}
