"use client";
import { useMasterLoveCodexLocale } from "../_lib/copy";
import { codexConsultationCopy, EMPTY_CONSULTATION, type CodexConsultationInput } from "../_lib/consultation";
import styles from "../styles/codex.module.css";
import CodexArtwork from "./CodexArtwork";
import { masterLoveCodexAssets } from "../data/assets";
import { codexGuideCopy } from "../_lib/consultation";

export default function CodexConsultationForm({ value = EMPTY_CONSULTATION, onChange, disabled }: {
  value?: CodexConsultationInput; onChange: (value: CodexConsultationInput) => void; disabled?: boolean;
}) {
  const locale = useMasterLoveCodexLocale();
  const copy = codexConsultationCopy(locale);
  const guide = codexGuideCopy(locale);
  const stage = ["new", "crush", "dating", "reunion", "marriage"].indexOf(value.relationship);
  const patch = (fields: Partial<CodexConsultationInput>) => onChange({ ...value, ...fields });
  return <fieldset className={styles.consultationForm} disabled={disabled} aria-describedby="codex-question-hint">
    <legend className={styles.chapterTitle}>{copy.title}</legend>
    <figure className={styles.consultationScene}>
      <CodexArtwork src={masterLoveCodexAssets.humanHero} alt={guide.alt}
        width={1200} height={675} sizes="(max-width: 767px) 100vw, 600px" className={styles.consultationArtwork} />
      <figcaption className={styles.consultationDialogue}>
        <strong>{guide.name}</strong>
        <p aria-live="polite" aria-atomic="true">{guide.lines[stage]}</p>
      </figcaption>
    </figure>
    <p>{copy.optional}</p>
    <label htmlFor="codex-relationship">{copy.relationship}</label>
    <select id="codex-relationship" value={value.relationship} onChange={e => patch({ relationship: e.target.value as CodexConsultationInput["relationship"] })}>
      {(["new", "crush", "dating", "reunion", "marriage"] as const).map((key, i) => <option key={key} value={key}>{copy.states[i]}</option>)}
    </select>
    <label htmlFor="codex-situation">{copy.situation} <small>{value.situation.length}/1500</small></label>
    <textarea id="codex-situation" maxLength={1500} rows={4} value={value.situation} onChange={e => patch({ situation: e.target.value })} />
    {value.questions.map((question, i) => <div key={i}>
      <label htmlFor={`codex-question-${i}`}>{copy.question} {i + 1} <small>{question.length}/500</small></label>
      <textarea id={`codex-question-${i}`} maxLength={500} rows={3} placeholder={copy.example} value={question}
        onChange={e => patch({ questions: value.questions.map((q, n) => n === i ? e.target.value : q) })} />
      {value.questions.length > 1 && <button type="button" onClick={() => patch({ questions: value.questions.filter((_, n) => n !== i) })}>{copy.question} {i + 1} {copy.remove}</button>}
    </div>)}
    {value.questions.length < 3 && <button type="button" onClick={() => patch({ questions: [...value.questions, ""] })}>{copy.add}</button>}
    <p id="codex-question-hint">{copy.hint}</p>
    <label htmlFor="codex-relationship-start">{copy.started}</label>
    <input id="codex-relationship-start" type="date" value={value.relationshipStartedAt} onChange={e => patch({ relationshipStartedAt: e.target.value })} />
    <label htmlFor="codex-separated">{copy.separated}</label>
    <input id="codex-separated" type="date" min={value.relationshipStartedAt || undefined} value={value.separatedAt} onChange={e => patch({ separatedAt: e.target.value })} />
  </fieldset>;
}
