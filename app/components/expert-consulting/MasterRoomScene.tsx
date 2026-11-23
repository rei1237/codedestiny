import ConsultationScene from "./ConsultationScene";

export type RoomMaster = "neo" | "yun" | "musung" | "hanbi" | "human" | "codex" | "fusion" | "heukwol" | "karma" | "love";

export default function MasterRoomScene({ master, still = false, shot = "wait" }: { master: RoomMaster; still?: boolean; shot?: "intro" | "wait" | "complete" }) {
  const base = `/images/consultation-rooms/${master}`;
  const cover = master === "karma" || master === "heukwol" || master === "fusion" ? "/images/consultation-rooms/neo.webp" : master === "love" ? "/images/consultation-rooms/human.webp" : base + ".webp";
  return <div style={{ width: "min(100%, 32rem)", marginInline: "auto" }}>
    {still ? <img src={cover} width={960} height={540} style={{width:"100%",height:"auto",borderRadius:16}} alt=""/>
     : <ConsultationScene key={master} poster={cover} clip={base + ".mp4" + (shot === "complete" ? "#t=3,8" : shot === "intro" ? "#t=0,6" : "")} loop={shot === "wait"}/>}
  </div>;
}
