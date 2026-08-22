"use client";

/**
 * 코덱스 한 장.
 *
 * 카드가 아니다 — 잉크 배경 위에 글이 떠 있고, 위아래 금박 헤어라인만 장을 구분한다.
 * 장 표식은 큰 Cinzel 숫자다(한자 심볼은 20자 중 15자가 로드된 폰트에 없어 두부 박스가 된다).
 */

import AiResultProse from "@/components/fortune/AiResultProse";
import CodexReveal from "./CodexReveal";
import { CODEX_CHAPTER_ANCHOR_PREFIX } from "../data/acts";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export interface CodexChapterData {
  id: string;
  order: number;
  title: string;
  body: string;
  content?: {
    narration?: string;
    evidence?: Array<{ label: string; system?: string; explanation?: string }>;
    insight?: string;
    keySentence?: string;
    caution?: string;
    actions?: string[];
    bridge?: string;
    visualization?: {
      kind?: string;
      title?: string;
      items?: Array<{ label: string; level: "low" | "balanced" | "high" | "watch" | "opportunity"; note?: string }>;
    } | null;
  };
  ok?: boolean;
}

interface CodexChapterProps {
  chapter: CodexChapterData;
  /** PDF 캡처 중 — 등장 애니메이션을 건너뛰고 즉시 노출 */
  forceVisible?: boolean;
}

/**
 * 생성물은 소제목을 `● 제목` 으로 낸다. AiResultProse 가 쓰는 parseProseBlocks 는
 * `##` 만 헤딩으로 인식하므로 렌더 직전에 바꿔 준다(워커 프롬프트는 그대로 둔다 —
 * 이미 저장된 세션과의 호환을 깨지 않기 위해서다).
 */
function normalizeHeadings(body: string): string {
  return String(body || "").replace(/^[ \t]*●[ \t]*/gm, "## ");
}

/** "제3장 · 부부궁이 말하는 배우자상" → "부부궁이 말하는 배우자상" */
function stripChapterPrefix(title: string): string {
  return String(title || "").replace(/^제\s*\d+\s*장\s*·\s*/, "");
}

export default function CodexChapter({ chapter, forceVisible = false }: CodexChapterProps) {
  const copy = useMasterLoveCodexCopy();
  const heading = stripChapterPrefix(chapter.title);
  const content = chapter.content;
  const hasEditorialContent = Boolean(content?.narration || content?.insight || content?.evidence?.length || content?.actions?.length);

  return (
    <article
      id={`${CODEX_CHAPTER_ANCHOR_PREFIX}${chapter.order}`}
      data-codex-pdf-page
      data-codex-chapter={chapter.order}
      className={styles.section}
    >
      <div className={styles.measure}>
        <CodexReveal forceVisible={forceVisible}>
          <p
            className={styles.numeral}
            style={{ fontSize: "clamp(2.75rem, 9vw, 4rem)", lineHeight: 1, color: "var(--codex-gold-dim)" }}
            aria-hidden="true"
          >
            {String(chapter.order).padStart(2, "0")}
          </p>
          <h2 className={`${styles.chapterTitle} mt-3`}>
            <span className="sr-only">{`제${chapter.order}장 · `}</span>
            {heading}
          </h2>
          <hr className={`${styles.rule} ${styles.ruleShort} mt-6 !ml-0`} />
        </CodexReveal>

        <CodexReveal forceVisible={forceVisible} index={1} className="mt-10">
          {content?.narration ? (
            <blockquote className={styles.narration}>
              <span aria-hidden="true">연애 고수</span>
              <p>{content.narration}</p>
            </blockquote>
          ) : null}

          {content?.evidence?.length ? (
            <section className={styles.evidence} aria-label={copy.chapterEvidenceAriaLabel}>
              <h3>{copy.chapterEvidenceAriaLabel}</h3>
              <div className={styles.evidenceChips}>
                {content.evidence.map((item) => (
                  <details key={`${item.system}-${item.label}`} className={styles.evidenceChip}>
                    <summary>{item.label}<span>{item.system}</span></summary>
                    {item.explanation ? <p>{item.explanation}</p> : null}
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {content?.insight ? <p className={styles.insight}>{content.insight}</p> : null}
          {content?.keySentence ? <p className={styles.keySentence}>{content.keySentence}</p> : null}

          {content?.visualization?.items?.length ? (
            <section className={styles.visualization} aria-label={content.visualization.title || copy.chapterVisualizationDefaultTitle}>
              <h3>{content.visualization.title || copy.chapterVisualizationDefaultTitle}</h3>
              <ul>
                {content.visualization.items.map((item) => (
                  <li key={item.label} data-level={item.level}>
                    <span>{item.label}</span>
                    <strong>{item.level === "low" ? copy.levelLow : item.level === "balanced" ? copy.levelBalanced : item.level === "high" ? copy.levelHigh : item.level === "watch" ? copy.levelWatch : copy.levelOpportunity}</strong>
                    {item.note ? <small>{item.note}</small> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {content?.caution ? (
            <section className={styles.caution}>
              <h3>{copy.chapterCautionTitle}</h3>
              <p>{content.caution}</p>
            </section>
          ) : null}

          {content?.actions?.length ? (
            <section className={styles.actions}>
              <h3>{copy.chapterActionsTitle}</h3>
              <ol>{content.actions.map((action) => <li key={action}>{action}</li>)}</ol>
            </section>
          ) : null}

          {hasEditorialContent ? (
            <details className={styles.detailProse} open={forceVisible}>
              <summary>{copy.chapterDetailSummary}</summary>
              <AiResultProse value={normalizeHeadings(chapter.body)} className={styles.prose} />
            </details>
          ) : <AiResultProse value={normalizeHeadings(chapter.body)} className={styles.prose} />}

          {content?.bridge ? <p className={styles.bridge}>{content.bridge}</p> : null}
        </CodexReveal>

        {chapter.ok === false ? (
          <CodexReveal forceVisible={forceVisible} index={2} className="mt-8">
            <p
              className="text-[0.8125rem] leading-7"
              style={{ color: "var(--codex-ink-text-muted)" }}
              role="status"
            >
              {copy.chapterOkFalseNote}
            </p>
          </CodexReveal>
        ) : null}
      </div>
    </article>
  );
}
