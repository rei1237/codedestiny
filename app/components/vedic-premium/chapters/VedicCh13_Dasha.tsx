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

function extractDashaHint(text: string): string {
  const source = sanitizePremiumText(text, "현재 다샤 핵심 포인트를 준비 중입니다.");
  const lines = source.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines[0] || source;
}

export default function VedicCh13_Dasha({ text, sections }: VedicChapterSampleProps) {
  const safeSections = sanitizePremiumSections(sections, "다샤 타이밍 데이터를 준비 중입니다.");
  const safeSummary = sanitizePremiumText(text, "다샤 분석 요약을 준비 중입니다.");
  const hint = extractDashaHint(safeSummary);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          borderRadius: 10,
          border: "1px solid rgba(45,212,191,0.25)",
          padding: "12px 14px",
          background: "rgba(13,148,136,0.08)",
        }}
      >
        <p style={{ margin: 0, color: "rgba(153,246,228,0.95)", fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.08em" }}>
          CH13 포인트 · 현재 다샤의 핵심 테마
        </p>
        <p style={{ margin: "8px 0 0", color: "rgba(204,251,241,0.92)", fontSize: "0.9rem", lineHeight: 1.7 }}>
          {hint}
        </p>
      </section>

      {safeSections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h4
            style={{
              color: "rgba(45,212,191,0.95)",
              fontWeight: 800,
              fontSize: "0.92rem",
              marginBottom: 8,
              paddingBottom: 5,
              borderBottom: "1px solid rgba(45,212,191,0.2)",
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
