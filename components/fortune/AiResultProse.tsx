"use client";

import { Fragment, type ReactNode } from "react";
import { parseProseBlocks } from "@/lib/llm-text";
import styles from "./ai-result-prose.module.css";

type ProseBlock = ReturnType<typeof parseProseBlocks>[number];

type AiResultProseProps = {
  /** LLM이 반환한 원시 필드(문자열/객체 등) — 내부에서 toDisplayText로 평탄화한다. */
  value: unknown;
  className?: string;
};

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function renderBlock(block: ProseBlock, index: number): ReactNode {
  switch (block.type) {
    case "h3":
      return (
        <h3 key={index} className={styles.heading}>
          {renderInline(block.text)}
        </h3>
      );
    case "ul":
      return (
        <ul key={index} className={styles.list}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className={styles.list}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={index} className={styles.quote}>
          {renderInline(block.text)}
        </blockquote>
      );
    case "p":
    default:
      return (
        <p key={index} className={styles.paragraph}>
          {block.lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {renderInline(line)}
              {lineIndex < block.lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
  }
}

/**
 * 전문가 상담 결과 LLM 텍스트를 문단/리스트/인용/소제목으로 구조화해 렌더링하는 공용 컴포넌트.
 * 8개 전문가 상담 기능(숙요점/자미두수/인생의책/연애비책/신년운세/베다점/점성술/운명의업) 결과 화면 전용 —
 * 운명의 찻집·네오의 팩폭 전략실에는 적용하지 않는다.
 */
export default function AiResultProse({ value, className = "" }: AiResultProseProps) {
  const blocks = parseProseBlocks(value);
  if (!blocks.length) return null;
  return <div className={`${styles.prose} ${className}`.trim()}>{blocks.map(renderBlock)}</div>;
}
