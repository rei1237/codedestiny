import { splitIntoParagraphs } from "@/lib/llm-text";

interface LlmParagraphsProps {
  text?: unknown;
  pClassName?: string;
}

/**
 * LLM 장문 프로즈를 2~4문장 문단 <p>들로 나눠 렌더링한다.
 * wrapper 없이 <p>만 반환하므로 각 피처의 기존 `p` 셀렉터/간격 규칙이 그대로 적용된다.
 */
export default function LlmParagraphs({ text, pClassName }: LlmParagraphsProps) {
  const paragraphs = splitIntoParagraphs(text);
  if (!paragraphs.length) return null;
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 16)}`} className={pClassName}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
