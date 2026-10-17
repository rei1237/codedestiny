import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import styles from "../styles/tea-report.module.css";

/** Speaker ownership follows the authored chapter contract, never alternating arbitrary paragraphs. */
export default function JointSajuDialogue({ title, body }: { title: string; body: string }) {
  const neo = title.startsWith("네오의 전략");
  const together = title.startsWith("함께 정리하는 30일");
  const name = together ? "연이와 네오" : neo ? "네오" : "연이";
  return <div className={styles.jointDialogue} data-speaker={together ? "together" : neo ? "neo" : "yeoni"}>
    <div className={styles.jointPortraits} aria-hidden="true">
      {(!neo || together) && <img src="/images/fortune-chat/persona/yeoni-read.webp" alt="" width="96" height="96" loading="lazy" decoding="async" />}
      {(neo || together) && <img src="/images/fortune-chat/persona/neo-think.webp" alt="" width="96" height="96" loading="lazy" decoding="async" />}
    </div>
    <div className={styles.jointSpeech}>
      <p className={styles.jointSpeaker}>{name}</p>
      <h4>{title}</h4>
      <LlmParagraphs text={body} />
    </div>
  </div>;
}
