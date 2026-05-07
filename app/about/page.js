import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { ABOUT_PAGE_COPY } from "../_content/seo-copy";
import { SUPPORT_EMAIL } from "../../lib/site-policy-config";

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
        email: SUPPORT_EMAIL,
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

export default function AboutPage() {
  return (
    <main className="cd-main-shell">
      <script
        type="application/ld+json"
        // Static JSON-LD string defined in this module.
        dangerouslySetInnerHTML={{ __html: ABOUT_JSON_LD }}
      />

      <header className="cd-main-header">
        <h1 className="cd-main-title">{ABOUT_PAGE_COPY.heading}</h1>
        <p className="cd-main-intro">{ABOUT_PAGE_COPY.intro}</p>
      </header>

      <section className="cd-card">
        <h2 style={{ marginTop: 0, marginBottom: "10px", color: "#f8fafc", fontSize: "clamp(1rem,2.5vw,1.2rem)" }}>
          운영 정보
        </h2>
        <div style={{ display: "grid", gap: "8px" }}>
          {ABOUT_PAGE_COPY.operatorRows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(130px, 170px) 1fr",
                gap: "10px",
                padding: "9px 10px",
                borderRadius: "10px",
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(15,23,42,0.35)",
              }}
            >
              <strong style={{ color: "#f8eecb", fontSize: "0.88rem" }}>{label}</strong>
              <span style={{ color: "#dbe5ff", lineHeight: 1.72 }}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cd-card">
        <h2 style={{ marginTop: 0, marginBottom: "10px", color: "#f8fafc", fontSize: "clamp(1rem,2.5vw,1.2rem)" }}>
          주요 서비스
        </h2>
        <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.85, color: "#dbe5ff" }}>
          {ABOUT_PAGE_COPY.serviceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2 style={{ marginTop: 0, marginBottom: "10px", color: "#f8fafc", fontSize: "clamp(1rem,2.5vw,1.2rem)" }}>
          관련 링크
        </h2>
        <div className="cd-chip-wrap">
          {ABOUT_PAGE_COPY.relatedLinks.map(([href, label]) => (
            <a key={href} href={href} className="cd-chip">
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
