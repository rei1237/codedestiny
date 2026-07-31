"use client";

import { Fragment, type ReactNode } from "react";
import { parseProseBlocks } from "@/lib/llm-text";
import styles from "./ai-result-prose.module.css";

type ProseBlock = ReturnType<typeof parseProseBlocks>[number];

type AiResultProseProps = {
  /** LLM이 반환한 원시 필드(문자열/객체 등) — 내부에서 toDisplayText로 평탄화한다. */
  value: unknown;
  className?: string;
  /**
   * 본문에서 <mark>로 강조할 문장들(정확 일치). 지정하지 않으면 기존 렌더 경로와 동일하므로
   * 이 컴포넌트를 쓰는 다른 상담 기능은 영향을 받지 않는다.
   */
  highlight?: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 굵게 처리가 끝난 평문 조각 안에서만 하이라이트를 찾는다(마크업을 깨뜨리지 않는다). */
function applyHighlight(text: string, pattern: RegExp | null, keyPrefix: string): ReactNode {
  if (!pattern) return text;
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;
  return parts.map((part, index) => (
    index % 2 === 1
      ? <mark key={`${keyPrefix}-${index}`} className={styles.mark}>{part}</mark>
      : <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>
  ));
}

function renderInline(text: string, pattern: RegExp | null = null): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{applyHighlight(part, pattern, String(index))}</Fragment>;
  });
}

function renderBlock(block: ProseBlock, index: number, pattern: RegExp | null = null): ReactNode {
  switch (block.type) {
    case "h3":
      return (
        <h3 key={index} className={styles.heading}>
          {renderInline(block.text, pattern)}
        </h3>
      );
    case "ul":
      return (
        <ul key={index} className={styles.list}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, pattern)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className={styles.list}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, pattern)}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={index} className={styles.quote}>
          {renderInline(block.text, pattern)}
        </blockquote>
      );
    case "p":
    default:
      return (
        <p key={index} className={styles.paragraph}>
          {block.lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {renderInline(line, pattern)}
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
export default function AiResultProse({ value, className = "", highlight }: AiResultProseProps) {
  const blocks = parseProseBlocks(value);
  if (!blocks.length) return null;
  const needles = (highlight || []).map((item) => String(item ?? "").trim()).filter((item) => item.length >= 6);
  const pattern = needles.length
    // 긴 문장을 먼저 매칭해야 짧은 문장이 긴 문장을 잘라먹지 않는다.
    ? new RegExp(`(${[...needles].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "g")
    : null;
  return (
    <div className={`${styles.prose} ${className}`.trim()}>
      {blocks.map((block, index) => renderBlock(block, index, pattern))}
    </div>
  );
}
