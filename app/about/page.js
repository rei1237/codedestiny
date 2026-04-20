import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { ABOUT_PAGE_COPY } from "../_content/seo-copy/index";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/about",
    title: "무료 사주 · 자미두수 운세 분석 서비스 소개 | Code Destiny",
    description:
      "Code Destiny(꿀꿀 만세력)는 사주팔자·타로·점성술·자미두수·숙요점 등 20가지 이상의 운세를 무료로 제공하는 AI 운세 플랫폼입니다. 서비스 미션·운영 원칙·운영자 정보·광고 정책을 확인하세요.",
    keywords: [
      "Code Destiny", "꿀꿀 만세력", "무료 운세 플랫폼", "서비스 소개", "운영자 소개",
      "사주 서비스", "타로 서비스", "운세 앱", "AI 운세", "무료 사주",
    ],
  });
}

/* ── 구조화 데이터 (JSON-LD) — 조직 + 웹페이지 ── */
const ABOUT_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://code-destiny.com/#organization",
      name: "Code Destiny",
      alternateName: "꿀꿀 만세력",
      url: "https://code-destiny.com",
      logo: {
        "@type": "ImageObject",
        url: "https://code-destiny.com/icons/honeypig.webp",
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "seongbae555@gmail.com",
        contactType: "customer support",
        availableLanguage: ["Korean", "English"],
      },
      sameAs: ["https://code-destiny.com"],
    },
    {
      "@type": "WebPage",
      "@id": "https://code-destiny.com/about#webpage",
      url: "https://code-destiny.com/about",
      name: "서비스 소개 — Code Destiny 꿀꿀 만세력",
      description:
        "Code Destiny는 사주팔자·타로·자미두수·점성술·숙요점 등 20종 이상의 무료 운세를 제공하는 AI 기반 운세 플랫폼입니다.",
      inLanguage: "ko",
      isPartOf: { "@id": "https://code-destiny.com/#website" },
      about: { "@id": "https://code-destiny.com/#organization" },
      dateModified: "2026-04-03",
    },
  ],
});

const SECTION = {
  background: "linear-gradient(145deg, rgba(12,18,48,0.88), rgba(22,11,44,0.76))",
  border: "1px solid rgba(167,139,250,0.24)",
  borderRadius: "16px",
  padding: "22px 24px",
  marginBottom: "16px",
  boxShadow: "0 14px 34px rgba(2,6,23,0.4)",
};

const H2 = { fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, marginBottom: "10px", color: "#f8fafc" };
const P  = { lineHeight: 1.88, color: "#dbe5ff", wordBreak: "keep-all", margin: 0 };

export default function AboutPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 16px 56px",
        color: "#e2e8f0",
      }}
    >
      {/* 본문 삭제됨: 소개/운영자/광고/환불/문의/정책 블록 전체 푸터로 이동 */}
    </main>
  );
}
