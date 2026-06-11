import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { FAQ_PAGE_COPY, FAQ_PAGE_ITEMS } from "../_content/seo-copy";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/faq",
    title: "무료 사주 · 자미두수 운세 분석 FAQ | 꿀꿀 만세력",
    description:
      "꿀꿀 만세력 사용 전 궁금한 무료 여부, 회원가입, 개인정보 보호, 사주 결과 신뢰도, 30일 이용권 환불 기준, 오류 문의 방법을 안내합니다.",
    keywords: ["FAQ", "자주 묻는 질문", "무료 운세 사용법", "30일 이용권 환불", "Code Destiny", "꿀꿀 만세력"],
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
        <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px", color: "#f8fafc" }}>30일 이용권 환불은 어떻게 처리되나요?</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          30일 이용권은 결제 완료 즉시 계정에 활성화되며 자동결제 상품이 아닙니다.
          아직 유료 기능을 이용하지 않았다면 결제일로부터 7일 이내 고객센터로 환불을 요청할 수 있습니다.
          이용권으로 유료 기능을 1회 이상 이용한 경우 환불이 제한될 수 있으며, 서비스 장애·중복 결제·결제 오류는 확인 후 기간 연장, 코인/월정석 보상, 부분 환불 또는 전액 환불 중 적절한 방식으로 처리합니다.
        </p>
      </section>

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
