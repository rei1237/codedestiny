import ConsultationReading from "@/components/fortune/ConsultationReading";
import { resolveLoveSpeaker, type LoveSpeaker } from "./love-secret-sections";
import styles from "./LoveSecretAiResultClient.module.css";

const avatars: Record<LoveSpeaker, string> = {
  yeoni: "/images/master-profiles/avatars/yeoni-love.webp",
  hanbi: "/images/master-profiles/avatars/hanbi-love.webp",
};

/** Existing section attribution, shared by the card, chapter reader and PDF. */
export function LoveSpeakerChip({ title, names }: { title: string; names?: Record<LoveSpeaker, string> }) {
  if (!names) return null;
  const speaker = resolveLoveSpeaker(title);
  return <p className={styles.speakerChip} data-speaker={speaker}>
    <img src={avatars[speaker]} alt="" width={24} height={24} decoding="async" />
    {names[speaker]}
  </p>;
}

export default function LoveReadingChapter({ index, section, speakerNames }: {
  index: number; section: { title: string; body: string }; speakerNames?: Record<LoveSpeaker, string>;
}) {
  return <article className={styles.letterChapter} data-speaker={resolveLoveSpeaker(section.title)}>
    <div className={styles.letterChapterHeading}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.chapterTitle}>
        <h3>{section.title}</h3>
        <LoveSpeakerChip title={section.title} names={speakerNames} />
      </div>
    </div>
    <ConsultationReading kind="love" value={section.body} index={index} speaker={resolveLoveSpeaker(section.title)} className={styles.chapterProse} />
  </article>;
}
