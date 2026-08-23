"use client";

// 장 하나. 🔴 문장을 만들지 않는다 — 제목도 블록도 전부 플랜에서 온다.
//
// 🔴 접힌 장을 `opacity: 0` 으로 숨기지 않는다. CodexReader 가 그렇게 했다가 "스크롤하지 않은
//    장이 PDF 에 백지로 찍히는" 사고를 냈다. 여기서 쓰는 content-visibility 는 그 사고와 무관한데,
//    우리 PDF 는 화면을 캡처하지 않고 같은 플랜을 텍스트로 조판하기 때문이다(요구 25).

import type { HdChart } from "../../_lib/types";
import type { ReportChapter as Chapter, ReportLocale } from "../_lib/types";
import ReportBlockView from "./ReportBlocks";
import styles from "../report.module.css";

type Props = {
  chapter: Chapter;
  chart: HdChart;
  locale: ReportLocale;
};

export default function ReportChapter({ chapter, chart, locale }: Props) {
  return (
    <section className={styles.chapter} id={`hd-ch-${chapter.key}`} data-chapter={chapter.key}>
      <header className={styles.chapterHead}>
        <span className={styles.chapterOrder} aria-hidden="true">{String(chapter.order).padStart(2, "0")}</span>
        <h2 className={styles.chapterTitle}>{chapter.title}</h2>
      </header>
      {chapter.blocks.map((block, index) => (
        <ReportBlockView
          key={`${chapter.key}-${index}-${block.kind}`}
          block={block}
          chart={chart}
          locale={locale}
          chapterKey={chapter.key}
        />
      ))}
    </section>
  );
}
