import * as React from "react";
import { LegalDocument } from "../../lib/legal/legalContent";

/**
 * `**강조**`를 <strong>으로, 줄바꿈을 <br/>로 바꿔 렌더링한다.
 * 법률 문서 본문은 JSX가 아니라 번역 가능한 순수 문자열로 데이터화되어 있어(lib/legal/legalContent.ts),
 * 렌더링 시점에만 최소한의 서식을 복원한다.
 */
function renderParagraphText(text: string, keyPrefix: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIndex) => {
    const boldParts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    const rendered = boldParts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${keyPrefix}-b-${lineIndex}-${partIndex}`}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={`${keyPrefix}-t-${lineIndex}-${partIndex}`}>{part}</React.Fragment>;
    });
    return (
      <React.Fragment key={`${keyPrefix}-line-${lineIndex}`}>
        {lineIndex > 0 ? <br /> : null}
        {rendered}
      </React.Fragment>
    );
  });
}

export function LegalDocumentBody({ document, dateLabel }: { document: LegalDocument; dateLabel: string }) {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">
        {dateLabel}: {document.effectiveDate}
      </p>

      {document.sections.map((section) => (
        <section key={section.id} id={section.id} className="policy-embed-section">
          <h2 className="policy-embed-heading">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-${index}`}>{renderParagraphText(paragraph, `${section.id}-${index}`)}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

export default LegalDocumentBody;
