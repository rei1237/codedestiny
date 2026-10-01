"use client";
import type { ReactNode } from "react";
import ReadingCharts from "@/app/yeongnyangi/_components/ReadingCharts";
import { ZiweiBlockHint } from "@/app/yeongnyangi/_components/ZiweiReadingChart";
import type { ReadingChart } from "@/worker/yeongnyangi/fortune/reading-presentation";
import type { ChapterBody } from "@/worker/yeongnyangi/fortune/book-contracts";
import type { ChatConsultation } from "./consultation-api";
import { RESULT_ORDER, SECTION_LABEL, type ResultSection } from "./consultation-world";
import { PersonaAvatar } from "./PersonaAvatar";
import styles from "./consultation.module.css";

type Answer = NonNullable<ChapterBody["questionAnswers"]>[number];
const MODE_NOTE: Record<string, string> = {
  limited: "명식만으로는 단정하기 어려운 질문이라, 확인할 수 있는 범위까지만 답했어요.",
  care: "마음이 많이 쓰이는 질문이라 조심스럽게 답했어요. 혼자 버거우면 주변이나 전문가의 도움도 함께 받아 주세요.",
};

function Body({ chapter, ziwei }: { chapter: ChapterBody; ziwei?: ReadingChart }) {
  return (
    <>
      {chapter.blocks?.length
        ? chapter.blocks.map((block, b) => (
            <div key={block.id || b} className={styles.block}>
              {block.title && <h4>{block.title}</h4>}
              <ZiweiBlockHint palaces={block.palaces} chart={ziwei} />
              {block.paragraphs.map((text, i) => <p key={i}>{text}</p>)}
            </div>
          ))
        : chapter.analysis.map((text, i) => <p key={i}>{text}</p>)}
      {chapter.example && <p className={styles.example}>{chapter.example}</p>}
    </>
  );
}

/**
 * 상담 결과. 섹션 순서는 상담자 세계를 따른다(consultation-world.ts) — 연이는 핵심 답변 → 요약 카드 → 근거 →
 * 흐름 → 시기 → 행동, 네오는 핵심 판단 → 지금 할 일 → 시기 → 판단 근거 → 판세 → 장별 브리핑. 마무리는 늘 끝이다.
 * 저장된 챕터만 그리며, 생성 중이면 남은 챕터 수를 함께 알린다.
 */
export default function ConsultationResult({ row, onNew }: { row: ChatConsultation; onNew: () => void }) {
  const chapters = row.chapters || [];
  const manifest = row.manifest || [];
  const ziweiChart = row.charts?.find((chart) => chart.domain === "ziwei");
  const first = chapters[0];
  if (!first) return null;
  const label = SECTION_LABEL[row.persona] || SECTION_LABEL.yeoni;
  const order = RESULT_ORDER[row.persona] || RESULT_ORDER.yeoni;
  const answers = chapters.flatMap((c) => c.questionAnswers || []);
  const core: Answer | undefined = answers[0];
  const questionText = (a: Answer) => row.consultation?.questions?.find((q) => q.id === a.questionId)?.text;
  const theme = (i: number) => manifest[i]?.theme;
  const title = (i: number) => chapters[i]?.title || manifest[i]?.title || `${i + 1}장`;
  const indexed = chapters.map((chapter, index) => ({ chapter, index }));
  const flow = indexed.filter(({ index }) => theme(index) !== "timing" && theme(index) !== "action");
  const timing = indexed.filter(({ index }) => theme(index) === "timing");
  const action = indexed.filter(({ index }) => theme(index) === "action");
  const closing = [...chapters].reverse().find((c) => c.persona)?.persona;
  const writing = chapters.length < manifest.length;
  const available = new Set(manifest.slice(0, chapters.length).map((c) => c.id));

  const sections: Record<ResultSection, () => ReactNode> = {
    core: () => (
      <section key="core" className={styles.core} aria-labelledby="consultation-core">
        <p className={styles.kicker} id="consultation-core">{label.core}</p>
        {(core && questionText(core)) || row.consultation?.question
          ? <blockquote className={styles.question}>{(core && questionText(core)) || row.consultation?.question}</blockquote>
          : null}
        {core?.mode && MODE_NOTE[core.mode] && <p className={styles.modeNote} role="note">{MODE_NOTE[core.mode]}</p>}
        <p className={styles.coreAnswer}>{core?.answer || first.summary}</p>
      </section>
    ),
    summary: () => (
      <section key="summary" aria-labelledby="consultation-summary">
        <h3 id="consultation-summary" className={styles.sectionTitle}>{label.summary}</h3>
        <ol className={styles.summaryCards}>
          {chapters.map((chapter, i) => (
            <li key={manifest[i]?.id || i}><strong>{title(i)}</strong><p>{chapter.summary}</p></li>
          ))}
        </ol>
      </section>
    ),
    evidence: () => (
      <section key="evidence" aria-labelledby="consultation-evidence">
        <h3 id="consultation-evidence" className={styles.sectionTitle}>{label.evidence}</h3>
        {core?.reason && <p>{core.reason}</p>}
        {!!first.highlights?.length && <ul className={styles.highlights}>{first.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
        {!!row.charts?.length && (
          <details className={styles.charts}>
            <summary>명식 자료 펼쳐 보기</summary>
            <ReadingCharts charts={row.charts} available={available} titles={Object.fromEntries(manifest.map((c, i) => [c.id, title(i)]))} locale={row.locale} />
          </details>
        )}
      </section>
    ),
    flow: () => (
      <section key="flow" aria-labelledby="consultation-flow">
        <h3 id="consultation-flow" className={styles.sectionTitle}>{label.flow}</h3>
        {answers.slice(1).map((a) => (
          <article key={a.questionId} className={styles.chapter}>
            <h4>{questionText(a) || "함께 물어본 것"}</h4>
            {a.mode && MODE_NOTE[a.mode] && <p className={styles.modeNote} role="note">{MODE_NOTE[a.mode]}</p>}
            <p>{a.answer}</p>
            {a.reason && <p className={styles.muted}>{a.reason}</p>}
          </article>
        ))}
        {flow.map(({ chapter, index }) => (
          <article key={manifest[index]?.id || index} className={styles.chapter}>
            <h4>{title(index)}</h4>
            <Body chapter={chapter} ziwei={ziweiChart} />
          </article>
        ))}
      </section>
    ),
    timing: () => (core?.timing || timing.length > 0) && (
      <section key="timing" aria-labelledby="consultation-timing">
        <h3 id="consultation-timing" className={styles.sectionTitle}>{label.timing}</h3>
        {core?.timing && <p className={styles.callout}>{core.timing}</p>}
        {timing.map(({ chapter, index }) => (
          <article key={manifest[index]?.id || index} className={styles.chapter}>
            <h4>{title(index)}</h4>
            <Body chapter={chapter} ziwei={ziweiChart} />
          </article>
        ))}
      </section>
    ),
    action: () => (core?.action || action.length > 0 || first.advice) && (
      <section key="action" aria-labelledby="consultation-action">
        <h3 id="consultation-action" className={styles.sectionTitle}>{label.action}</h3>
        {(core?.action || first.advice) && <p className={styles.callout}>{core?.action || first.advice}</p>}
        {action.map(({ chapter, index }) => (
          <article key={manifest[index]?.id || index} className={styles.chapter}>
            <h4>{title(index)}</h4>
            <Body chapter={chapter} ziwei={ziweiChart} />
            {chapter.advice && <p className={styles.callout}>{chapter.advice}</p>}
          </article>
        ))}
      </section>
    ),
  };

  return (
    <div className={styles.result} data-consultation-result data-persona={row.persona}>
      {order.map((key) => sections[key]())}

      {writing ? (
        <p className={styles.progress} role="status" aria-live="polite">
          남은 이야기를 이어서 쓰는 중이에요 · {chapters.length} / {manifest.length}
        </p>
      ) : (
        <section className={styles.closing} aria-labelledby="consultation-closing">
          <h3 id="consultation-closing" className={styles.sectionTitle}>{label.closing}</h3>
          <div className={styles.closingLine}>
            <PersonaAvatar persona={row.persona} mood="cheer" size="sm" decorative />
            {closing && <p>{closing}</p>}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={onNew}>새 상담 시작하기</button>
          </div>
        </section>
      )}
    </div>
  );
}
