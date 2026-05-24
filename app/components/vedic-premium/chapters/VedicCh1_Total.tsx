import React from "react";
import { sanitizePremiumSections, sanitizePremiumText } from "@/app/_lib/vedic/premium/guards/premiumTextGuard";
import type { VedicChapterSampleProps } from "./types";

function paragraphize(text: string) {
  return text.split(/\n{2,}/).map((para, index) => (
    <p
      key={index}
      style={{
        lineHeight: 1.95,
        letterSpacing: "0.02em",
        color: "rgba(203,213,225,0.9)",
        fontSize: "0.94rem",
        marginBottom: "0.92em",
      }}
    >
      {para.replace(/\n/g, " ")}
    </p>
  ));
}

export default function VedicCh1_Total({ text, sections }: VedicChapterSampleProps) {
  const safeSections = sanitizePremiumSections(sections, "차트 총론 데이터가 아직 준비되지 않았습니다.");
  const safeSummary = sanitizePremiumText(text, "차트 종합 진단 텍스트를 준비 중입니다.");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          borderRadius: 10,
          border: "1px solid rgba(212,160,23,0.22)",
          padding: "12px 14px",
          background: "rgba(212,160,23,0.06)",
        }}
      >
        <p style={{ margin: 0, color: "rgba(253,230,138,0.95)", fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.08em" }}>
          CH1 요약 · 나의 카르마 설계도
        </p>
        <div style={{ marginTop: 8 }}>{paragraphize(safeSummary)}</div>
      </section>

      {safeSections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h4
            style={{
              color: "rgba(212,160,23,0.95)",
              fontWeight: 800,
              fontSize: "0.92rem",
              marginBottom: 8,
              paddingBottom: 5,
              borderBottom: "1px solid rgba(212,160,23,0.14)",
            }}
          >
            {section.title}
          </h4>
          {paragraphize(section.body)}
        </section>
      ))}
    </div>
  );
}
