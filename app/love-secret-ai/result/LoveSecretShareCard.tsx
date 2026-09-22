"use client";

import { forwardRef } from "react";

/** 1080×1350 card. Keep content inside the central square for messenger crops.
 * Local, opaque surfaces support html2canvas. Never include the partner profile.
 * The offscreen node must remain painted for image capture.
 */
const LoveSecretShareCard = forwardRef<HTMLDivElement, {
  myName: string;
  summaryTitle: string;
  oneLine: string;
  temperature: string;
  keywords: string[];
  generatedAt: string;
  dark: boolean;
}>(function LoveSecretShareCard({ myName, summaryTitle, oneLine, temperature, keywords, generatedAt }, ref) {
  // The illustrated paper stays ivory in both themes; its ink stays paired.
  const palette = { bg: "#f6f2ed", ink: "#35262c", muted: "#71545f", accent: "#763d53", line: "#d4c3b8" };

  return (
    <div ref={ref} aria-hidden="true" style={{
      position: "fixed", left: -12000, top: 0, width: 1080, height: 1350,
      background: `${palette.bg} url('/images/expert-consulting/love-letter-paper-20260923.webp') center / 100% 100%`, fontFamily: "var(--font-body)",
      display: "flex", flexDirection: "column", padding: "130px 100px 270px 125px", boxSizing: "border-box",
    }}>
      <div style={{
        flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        padding: "24px", boxSizing: "border-box",
      }}>
        <h2 style={{ margin: 0, font: `600 ${summaryTitle.length > 22 ? 50 : 60}px/1.45 var(--font-premium)`, color: palette.ink, wordBreak: "keep-all" }}>
          {Array.from(summaryTitle).slice(0, 34).join("")}
        </h2>
        <div style={{ marginTop: 40, paddingTop: 40, borderTop: `1px solid ${palette.line}` }}>
          <p style={{ margin: 0, font: `400 ${oneLine.length > 60 ? 34 : 43}px/1.8 var(--font-premium)`, color: palette.ink, wordBreak: "keep-all" }}>
            {Array.from(oneLine).slice(0, 90).join("")}
          </p>
          {temperature && <p style={{ margin: "24px 0 0", fontSize: 26, lineHeight: 1.7, color: palette.muted, wordBreak: "keep-all" }}>
            {Array.from(temperature).slice(0, 56).join("")}
          </p>}
          {keywords.length > 0 && <p style={{ margin: "28px 0 0", fontSize: 24, lineHeight: 1.6, color: palette.accent }}>
            {keywords.slice(0, 3).map(keyword => Array.from(keyword).slice(0, 12).join("")).join(" · ")}
          </p>}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 32, color: palette.muted }}>
          <p style={{ margin: 0, fontSize: 24 }}>{myName} · {generatedAt}</p>
          <p style={{ margin: "14px 0 0", fontSize: 22 }}>Code Destiny · code-destiny.com/love-secret-ai</p>
        </div>
      </div>
    </div>
  );
});

export default LoveSecretShareCard;
