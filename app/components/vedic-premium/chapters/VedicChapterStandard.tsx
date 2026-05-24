import React from "react";
import { sanitizePremiumSections, sanitizePremiumText } from "@/app/_lib/vedic/premium/guards/premiumTextGuard";
import type { VedicChapterSampleProps } from "./types";

type Props = VedicChapterSampleProps & {
  badge: string;
  accent?: string;
  title?: string;
};

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

export default function VedicChapterStandard({ text, sections, badge, accent = "rgba(212,160,23,0.95)", title }: Props) {
  const safeSections = sanitizePremiumSections(sections, "챕터 데이터를 준비 중입니다.");
  const safeSummary = sanitizePremiumText(text, "챕터 요약을 준비 중입니다.");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          borderRadius: 10,
          border: `1px solid ${accent.replace("0.95", "0.25")}`,
          padding: "12px 14px",
          background: "rgba(15,23,42,0.3)",
        }}
      >
        <p style={{ margin: 0, color: accent, fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.08em" }}>
          {badge}
        </p>
        {title ? <p style={{ margin: "7px 0 0", color: "rgba(226,232,240,0.92)", fontWeight: 700 }}>{title}</p> : null}
        <div style={{ marginTop: 8 }}>{paragraphize(safeSummary)}</div>
      </section>

      {safeSections.map((section, index) => (
        <section key={`${section.title}-${index}`}>
          <h4
            style={{
              color: accent,
              fontWeight: 800,
              fontSize: "0.92rem",
              marginBottom: 8,
              paddingBottom: 5,
              borderBottom: `1px solid ${accent.replace("0.95", "0.2")}`,
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
