export const metadata = {
  title: "FAQ | 자주 묻는 질문",
  description:
    "Code Destiny(연이의 꿀꿀 만세력) 서비스 이용, 무료 여부, 개인정보, 문의 방법 등 자주 묻는 질문을 안내합니다.",
  keywords: ["FAQ", "자주 묻는 질문", "Code Destiny", "연이의 꿀꿀 만세력", "고객지원"],
  alternates: {
    canonical: "/faq",
  },
};

const sectionStyle = {
  background:
    "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

const faqItems = [
  {
    q: "서비스는 무료인가요? / Is the service free?",
    a: "네. Code Destiny는 기본적으로 무료로 운세·타로·점성술 등 콘텐츠를 이용할 수 있도록 설계되어 있습니다. 일부 기능은 광고 또는 포인트 정책이 적용될 수 있으며, 해당 경우 화면 안내를 따릅니다. / Yes. Code Destiny is designed so core fortune and tarot experiences are generally free. Some features may involve ads or points; follow on-screen notices when applicable.",
  },
  {
    q: "회원가입이 필수인가요? / Do I need an account?",
    a: "대부분의 운세·리딩은 기본 이용만으로도 가능합니다. 로그인·포인트·저장 기능 등은 계정이 필요할 수 있습니다. / Most readings work without signing up. Sign-in may be required for points, saved history, or similar features.",
  },
  {
    q: "입력한 생년월일·사주 정보는 어떻게 처리되나요? / How is my birth data handled?",
    a: "개인정보 처리·보관·쿠키·광고는 개인정보처리방침에 따릅니다. 민감 정보는 입력 최소화를 권장하며, 권리 행사는 문의 채널로 요청할 수 있습니다. / See our Privacy Policy for how we process data, cookies, and ads. We recommend sharing only what is necessary; you may exercise privacy rights via our contact channels.",
  },
  {
    q: "운세·타로 결과는 과학적·법적 효력이 있나요? / Are results legally or scientifically binding?",
    a: "모든 결과는 참고용 엔터테인먼트·성찰 목적이며, 의학·법률·투자 등 전문 의사결정의 대체가 되지 않습니다. / All results are for entertainment and reflection only. They do not replace medical, legal, financial, or other professional advice.",
  },
  {
    q: "모바일·다양한 브라우저에서도 이용할 수 있나요? / Can I use it on mobile browsers?",
    a: "반응형·터치 환경을 고려해 제작되었습니다. 다만 기기/OS·브라우저에 따라 일부 애니메이션·광고·번역 스크립트 동작이 달라질 수 있습니다. / The site is built for responsive and touch use. Animations, ads, or translation widgets may behave differently by device/OS/browser.",
  },
  {
    q: "오류가 나거나 제안이 있으면 어디로 연락하나요? / How do I report bugs or suggestions?",
    a: "하단 문의하기(Contact Us) 페이지의 이메일로 접수해 주세요. 제목에 오류 유형·기기·브라우저를 적어 주시면 확인에 도움이 됩니다. / Please use the Contact Us page linked in the footer. Include error type, device, and browser in the subject for faster triage.",
  },
];

export default function FaqPage() {
  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
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
        자주 묻는 질문 (FAQ)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        Code Destiny(연이의 꿀꿀 만세력) 이용에 관해 자주 받는 질문을 정리했습니다. 더 자세한 내용은 개인정보처리방침·이용약관을 참고하시거나
        문의하기로 연락해 주세요.
      </p>
      <p style={{ opacity: 0.88, lineHeight: 1.82, marginBottom: "22px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        Below are answers to common questions about Code Destiny. For details, see our Privacy Policy and Terms of Service, or reach us via
        Contact Us.
      </p>

      {faqItems.map((item, idx) => (
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
