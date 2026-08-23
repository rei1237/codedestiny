"use client";

// 블록 렌더러 레지스트리 (요구 21).
//
// 🔴 이 파일은 **문장을 만들지 않는다.** 모든 글자는 lib/human-design/report-plan.js 가 만든
//    블록에서 온다. 화면이 문구를 보태는 순간 그 문구는 PDF 에 없으므로 웹과 PDF 가 갈린다
//    (요구 3·26). 그래서 여기에는 긴 한글 리터럴이 한 줄도 없어야 하고,
//    __tests__/ui/human-design-report.static.test.js 가 그것을 단언한다.
//
// 🔴 레지스트리를 `Record<ReportBlockKind, Renderer>` 로 선언한 이유는 **종류를 빠뜨리면
//    컴파일이 깨지게** 하기 위해서다. 플랜에 블록 종류가 늘면 여기가 먼저 빨개진다.

import type { JSX } from "react";

import type { HdChart } from "../../_lib/types";
import type { ReportBlock, ReportBlockKind, ReportLocale } from "../_lib/types";
import ChartFigure from "./ChartFigure";
import styles from "../report.module.css";

type RenderInput = {
  block: ReportBlock;
  chart: HdChart;
  locale: ReportLocale;
  chapterKey: string;
};

type Renderer = (input: RenderInput) => JSX.Element | null;

/** 막대 길이. 0 나눗셈과 100 초과를 함께 막는다. */
function ratio(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

const RENDERERS: Record<ReportBlockKind, Renderer> = {
  lead: ({ block }) => {
    const { text } = block as Extract<ReportBlock, { kind: "lead" }>;
    return <p className={styles.lead}>{text}</p>;
  },

  paragraph: ({ block }) => {
    const { text } = block as Extract<ReportBlock, { kind: "paragraph" }>;
    return <p className={styles.paragraph}>{text}</p>;
  },

  heading: ({ block }) => {
    const { text, anchorId } = block as Extract<ReportBlock, { kind: "heading" }>;
    return <h3 className={styles.subheading} id={anchorId ? `hdr-${anchorId.replace(/[^a-zA-Z0-9-]/g, "-")}` : undefined}>{text}</h3>;
  },

  bullets: ({ block }) => {
    const { title, items } = block as Extract<ReportBlock, { kind: "bullets" }>;
    if (!items.length) return null;
    return (
      <aside className={styles.evidence}>
        <p className={styles.evidenceTitle}>{title}</p>
        <ul className={styles.evidenceList}>
          {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>
      </aside>
    );
  },

  quote: ({ block }) => {
    const { text } = block as Extract<ReportBlock, { kind: "quote" }>;
    return <blockquote className={styles.quote}>{text}</blockquote>;
  },

  insight: ({ block }) => {
    const { title, items } = block as Extract<ReportBlock, { kind: "insight" }>;
    if (!items.length) return null;
    return (
      <section className={styles.insight}>
        <p className={styles.insightTitle}>{title}</p>
        <ul className={styles.insightList}>
          {items.map((item, index) => <li key={`${index}-${item.slice(0, 12)}`}>{item}</li>)}
        </ul>
      </section>
    );
  },

  steps: ({ block }) => {
    const { title, items } = block as Extract<ReportBlock, { kind: "steps" }>;
    if (!items.length) return null;
    return (
      <section className={styles.steps}>
        <p className={styles.insightTitle}>{title}</p>
        <ol className={styles.stepsList}>
          {items.map((item) => (
            <li key={item.index}>
              <span className={styles.stepIndex} aria-hidden="true">{item.index}</span>
              <span className={styles.stepText}>{item.text}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  },

  summary: ({ block }) => {
    const { title, items } = block as Extract<ReportBlock, { kind: "summary" }>;
    if (!items.length) return null;
    return (
      <section className={styles.summary}>
        <p className={styles.insightTitle}>{title}</p>
        <ul className={styles.insightList}>
          {items.map((item, index) => <li key={`${index}-${item.slice(0, 12)}`}>{item}</li>)}
        </ul>
      </section>
    );
  },

  keyvalue: ({ block }) => {
    const { title, rows } = block as Extract<ReportBlock, { kind: "keyvalue" }>;
    if (!rows.length) return null;
    return (
      <section className={styles.dataTable}>
        <p className={styles.dataTitle}>{title}</p>
        <dl className={styles.dataRows}>
          {rows.map((row) => (
            <div className={styles.dataRow} key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  },

  meter: ({ block }) => {
    const { title, items } = block as Extract<ReportBlock, { kind: "meter" }>;
    if (!items.length) return null;
    return (
      <section className={styles.dataTable}>
        <p className={styles.dataTitle}>{title}</p>
        <ul className={styles.meterList}>
          {items.map((item) => (
            <li className={styles.meterRow} key={item.label}>
              <span className={styles.meterLabel}>{item.label}</span>
              <span className={styles.meterTrack} aria-hidden="true">
                <span className={styles.meterFill} style={{ width: `${ratio(item.value, item.max).toFixed(1)}%` }} />
              </span>
              <span className={styles.meterValue}>{item.display}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  },

  chart: ({ block, chart, locale, chapterKey }) => {
    const { slotId, selection, caption } = block as Extract<ReportBlock, { kind: "chart" }>;
    return (
      <ChartFigure
        slotId={slotId}
        chapterKey={chapterKey}
        chart={chart}
        selection={selection}
        caption={caption}
        locale={locale}
      />
    );
  },
};

export default function ReportBlockView(input: RenderInput) {
  // 모르는 종류는 본문으로 떨어뜨린다 — 새 플랜 버전이 옛 화면에 열려도 글이 사라지지 않는다.
  const render = RENDERERS[input.block.kind as ReportBlockKind] || RENDERERS.paragraph;
  return render(input);
}

export { RENDERERS as __reportBlockRenderers };
