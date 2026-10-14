"use client";
import { useMasterLoveCodexLocale } from "../_lib/copy";
import { codexConsultationCopy, type CodexConsultation, type CodexQuestionAnswer, type CodexPeriodReading } from "../_lib/consultation";
import styles from "../styles/codex.module.css";

export default function CodexConsultationAnswers({ consultation, answers = [], periods = [] }: {
  consultation?: CodexConsultation | null; answers?: CodexQuestionAnswer[]; periods?: CodexPeriodReading[];
}) {
  const endDate = (until: string) => new Date(Date.parse(until + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
  const copy = codexConsultationCopy(useMasterLoveCodexLocale());
  if (!consultation) return null;
  return <div className={styles.consultationAnswers}>
    {answers.map(a => <section key={a.questionId} aria-label={consultation.questions.find(q => q.id === a.questionId)?.text}>
      <h3>{consultation.questions.find(q => q.id === a.questionId)?.text}</h3>
      <p>{a.answer}</p>
      <h4>{copy.basis}</h4><p>{a.reasoning}</p>
      <h4>{copy.outlook}</h4><p>{a.outlook}</p>
      <h4>{copy.actions}</h4><ol>{a.actions.map((action, i) => <li key={i}>{action}</li>)}</ol>
      <h4>{copy.reassess}</h4><p>{a.reassess}</p>
    </section>)}
    {!!periods.length && <section>
      <h3>{copy.timing}</h3>
      <p>{copy.reference}: {consultation.referenceDate}</p>
      {periods.map(p => {
        const interval = consultation.periods.find(row => row.id === p.periodId);
        return <section key={p.periodId}>
          <h4>{interval ? `${interval.from} ~ ${endDate(interval.until)}` : p.periodId.replace("year-", "")}</h4>
          <p>{p.interpretation}</p><p><strong>{copy.actions}</strong> · {p.action}</p>
          <p><strong>{copy.reassess}</strong> · {p.reassess}</p>
        </section>;
      })}
    </section>}
  </div>;
}
