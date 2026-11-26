import ConsultationReading from "@/components/fortune/ConsultationReading";
import { LoveMasterImage } from "./LoveReportOverview";
import { loveReportMasters } from "./love-report-overview";
import { resolveLoveSpeaker, type LoveSpeaker } from "./love-secret-sections";
import styles from "./LoveSecretAiResultClient.module.css";

/** Existing section attribution, shared by the card, chapter reader and PDF. */
export function LoveSpeakerChip({ title, names }: { title: string; names?: Record<LoveSpeaker, string> }) {
  if (!names) return null;
  const speaker = resolveLoveSpeaker(title);
  return <p className={styles.speakerChip} data-speaker={speaker}>
    <LoveMasterImage src={loveReportMasters[speaker].avatar} size={24} />
    {names[speaker]}
  </p>;
}

/** number: 화면 전체에서의 장 번호(없으면 덱 안 순서). kicker: 그 장이 속한 부 이름. */
export default function LoveReadingChapter({ index, number, kicker, section, speakerNames }: {
  index: number; number?: number; kicker?: string; section: { title: string; body: string }; speakerNames?: Record<LoveSpeaker, string>;
}) {
  return <article id={number ? `love-chapter-${number}` : undefined} className={styles.letterChapter} data-speaker={resolveLoveSpeaker(section.title)}>
    <div className={styles.letterChapterHeading}>
      <span>{String(number || index + 1).padStart(2, "0")}</span>
      <div className={styles.chapterTitle}>
        {kicker ? <p className={styles.chapterKicker}>{kicker}</p> : null}
        <h3>{section.title}</h3>
        <LoveSpeakerChip title={section.title} names={speakerNames} />
      </div>
    </div>
    <ConsultationReading kind="love" value={section.body} index={index} speaker={resolveLoveSpeaker(section.title)} className={styles.chapterProse} />
  </article>;
}
