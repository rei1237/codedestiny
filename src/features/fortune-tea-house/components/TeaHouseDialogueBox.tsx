import type { TeaHouseSpeaker } from "../data/story";
import type { TeaHouseEntrySpeaker } from "../data/entryStory";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseDialogueBoxProps = {
  speaker?: TeaHouseSpeaker | TeaHouseEntrySpeaker;
  text: string;
  className?: string;
};

export default function TeaHouseDialogueBox({ speaker = "narration", text, className = "" }: TeaHouseDialogueBoxProps) {
  const speakerLabel = speaker === "narration" ? "" : speaker;
  const isSystem = speaker === "narration";
  const speakerIcon = speaker === "연이" ? "蓮" : speaker === "꽃돼지?" ? "花" : "茶";

  return (
    <div className={`${styles.dialogueBox} ${className}`} data-speaker={speaker} data-frame={isSystem ? "system" : "character"}>
      {!isSystem ? (
        <div className={styles.dialogueSpeaker}>
          <span aria-hidden>{speakerIcon}</span>
          <strong>{speakerLabel}</strong>
        </div>
      ) : null}
      <p>{text}</p>
    </div>
  );
}
