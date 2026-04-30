"use client";

import React, { use } from "react";
import MysticalLanding from "./components/MysticalLanding";
import { FaqJsonLd } from "./components/SeoJsonLd";

/**
 * Next.js 15 Migration:
 * This page is now a Client Component to support styled-jsx and interactive elements
 * used in MysticalLanding and other UI components.
 * 
 * Note: Metadata is now handled via layout.js for the root path.
 */

export default function Home(props) {
  // Next.js 15: searchParams is a Promise in Client Components
  const searchParams = use(props.searchParams);

  const faqData = [
    {
      question: "무료 사주 서비스는 정말 무료인가요?",
      answer: "네, 코드 데스티니의 기본 만세력과 일주 분석 서비스는 로그인 없이도 무료로 이용 가능합니다.",
    },
    {
      question: "자미두수 운세 분석이란 무엇인가요?",
      answer: "자미두수는 별들의 배치(12궁)를 통해 운명을 읽는 동양의 점성술로, 매우 정교한 운세 분석 기법입니다.",
    },
    {
      question: "AI 타로 상담은 어떻게 진행되나요?",
      answer: "사용자가 고른 카드 이미지를 AI가 분석하여 현재의 상황과 미래에 대한 조언을 텍스트로 생성해 드립니다.",
    },
  ];

  return (
    <>
      <FaqJsonLd faqs={faqData} />
      
      {/* New Mystical Landing Page UI */}
      <MysticalLanding />

      <section style={{ padding: "4rem 2rem", background: "#0f0920", borderTop: "1px solid #2a1b52" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ color: "#f5e7b2", fontSize: "1.8rem", marginBottom: "2rem", textAlign: "center" }}>자주 묻는 질문 (FAQ)</h2>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {faqData.map((item, idx) => (
              <div key={idx} style={{ background: "rgba(255,255,255,0.05)", padding: "1.5rem", borderRadius: "1rem" }}>
                <h3 style={{ color: "#a78bfa", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Q. {item.question}</h3>
                <p style={{ color: "#cccccc", fontSize: "0.95rem", lineHeight: "1.6" }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: "2rem", textAlign: "center", background: "#0a061a", color: "#666" }}>
        <p style={{ fontSize: "0.8rem" }}>© 2026 Code Destiny. All rights reserved.</p>
        <div style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
          <a href="/?legacy=true" style={{ color: "#4b3a8a", textDecoration: "none" }}>Classic Mode View</a>
        </div>
      </footer>
    </>
  );
}
