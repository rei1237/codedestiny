import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { FAQ_PAGE_COPY, FAQ_PAGE_ITEMS } from "../_content/seo-copy";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/faq",
    title: "무료 사주 · 자미두수 운세 분석 FAQ | 꿀꿀 만세력",
    description:
      "꿀꿀 만세력 사용 전 꾸르는 충문 해소! 무료여부, 회원가입 필요 여부, 개인정보 보호, 사주 결과 신뢰도, 오류 문의 방법까지 상세히 안내합니다.",
    keywords: ["FAQ", "자주 묻는 질문", "무료 운세 사용법", "Code Destiny", "꿀꿀 만세력"],
  });
}

const sectionStyle = {
  background:
    "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

export default function FaqPage() {
  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_PAGE_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q.split(" / ")[0].trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a.split(" / ")[0].trim(),
      },
    })),
  });

  return (
    <main
      style={{
        maxWidth: "920px",
        margin: "0 auto",
        padding: "28px 16px 42px",
        color: "#e2e8f0",
        background:
          "radial-gradient(640px 280px at 12% 2%, rgba(124,58,237,.2), transparent 60%), radial-gradient(520px 260px at 86% 8%, rgba(78,205,196,.16), transparent 64%)",
      }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <h1
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
          fontWeight: 800,
          marginBottom: "8px",
          lineHeight: 1.28,
          letterSpacing: "0.01em",
          color: "#f8fafc",
          textShadow: "0 0 18px rgba(244, 206, 120, 0.2)",
        }}
      >
        무료 사주 · 자미두수 운세 분석 자주 묻는 질문 (FAQ)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        {FAQ_PAGE_COPY.introKo}
      </p>
      <p style={{ opacity: 0.88, lineHeight: 1.82, marginBottom: "22px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        {FAQ_PAGE_COPY.introEn}
      </p>

      {FAQ_PAGE_ITEMS.map((item, idx) => (
        <section key={idx} style={{ ...sectionStyle, marginBottom: "14px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px", color: "#f8fafc" }}>{item.q}</h2>
          <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>{item.a}</p>
        </section>
      ))}

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>관련 문서 / Related pages</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            개인정보처리방침 (Privacy Policy)
          </a>
          {" · "}
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            이용약관 (Terms of Service)
          </a>
          {" · "}
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            문의하기 (Contact Us)
          </a>
        </p>
      </section>
    </main>
  );
}

