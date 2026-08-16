import type { ReactNode } from "react";
import { splitIntoParagraphs } from "@/lib/llm-text";
import styles from "./neo-fact-punch.module.css";

/**
 * 팩폭 장문(`bluntTruth` 는 minChars 1300)을 두 화면이 같은 규칙으로 그리기 위한 렌더러.
 *
 * 🔴 입장 페이지(`NeoOperationRoomPage`)는 이 컴포넌트가 생기기 전까지 원문 문자열을 그대로
 *    `{text}` 로 뿌려 문단이 0개였다(굵기 950 · 줄 길이 무제한). 결과 페이지만 문단 분할을
 *    받았던 탓에 같은 본문이 화면마다 다르게 보였다. 렌더러를 여기 하나로 모아 재발을 막는다.
 *
 * 문단 분할은 `lib/llm-text.js` 의 공용 유틸을 그대로 쓴다(27개 기능이 공유하므로 그쪽은 고치지 않는다).
 */

// LLM 이 계산 근거를 [재백궁] · [화기:문창] 처럼 대괄호로 표기하면 칩으로 집어낸다.
// 길이 상한이 오탐 방어다 — 대괄호로 감싼 긴 문장은 용어가 아니므로 평문으로 남긴다.
// 프롬프트에 대괄호 표기 지시가 없어 출력이 흔들릴 수 있으므로, 없으면 평문 그대로 나온다.
const TERM_PATTERN = /\[([^[\]\n]{1,20})\]/g;

function renderWithTerms(text: string, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TERM_PATTERN.lastIndex = 0;
  while ((match = TERM_PATTERN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <b key={`${keyPrefix}-${match.index}`} className={styles.term}>
        {match[1]}
      </b>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (!nodes.length) return text;
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type NeoFactPunchProps = {
  text?: unknown;
  /** 강도 연출 등 화면별 추가 클래스 (입장 페이지의 bluntTruthImpact) */
  className?: string;
  /** 골드 라벨 문구. 기존 `.blunt::before` 와 같은 기본값을 쓴다. */
  label?: string;
  intensity?: string;
};

export default function NeoFactPunch({ text, className = "", label = "NEO · 팩폭", intensity }: NeoFactPunchProps) {
  const paragraphs = splitIntoParagraphs(text);
  if (!paragraphs.length) return null;
  return (
    <blockquote className={`${styles.punch} ${className}`.trim()} data-intensity={intensity}>
      <span className={styles.label}>{label}</span>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 16)}`} className={index === 0 ? styles.lead : undefined}>
          {renderWithTerms(paragraph, String(index))}
        </p>
      ))}
    </blockquote>
  );
}
