import type { CSSProperties } from "react";
import type { TeaHouseSpeaker } from "../data/story";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseDialogueBoxProps = {
  speaker?: TeaHouseSpeaker;
  text: string;
  className?: string;
};

export default function TeaHouseDialogueBox({ speaker = "narration", text, className = "" }: TeaHouseDialogueBoxProps) {
  const speakerLabel = speaker === "narration" ? "내레이션" : speaker;
  const isSystem = speaker === "narration";
  const frameStyle = {
    "--tea-dialogue-frame": `url("${fortuneTeaHouseAssets.yeoni.bubble}")`,
  } as CSSProperties;

  return (
    <div className={`${styles.dialogueBox} ${className}`} data-speaker={speaker} data-frame={isSystem ? "system" : "character"} style={frameStyle}>
      <div className={styles.dialogueSpeaker}>
        <span aria-hidden>{speaker === "연이" ? "月" : speaker === "꽃돼지?" ? "花" : "茶"}</span>
        <strong>{speakerLabel}</strong>
      </div>
      <p>{text}</p>
    </div>
  );
}
