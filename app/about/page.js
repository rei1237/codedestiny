export const metadata = {
  title: "About Code Destiny | 서비스 소개",
  description:
    "Code Destiny의 서비스 목적, 콘텐츠 제작 기준, 운영 원칙, 문의 채널을 안내하는 공식 소개 페이지입니다.",
  alternates: {
    canonical: "/about",
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

export default function AboutPage() {
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
        서비스 소개 (About Code Destiny)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        Code Destiny는 사주, 타로, 점성술 기반의 자기성찰형 콘텐츠를 제공하는 웹 서비스입니다. 결과는 참고 및 오락 목적이며,
        사용자가 자신의 선택을 더 명확히 정리하도록 돕는 것을 목표로 합니다.
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>1. 서비스 미션</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          전통 명리학과 현대 인터랙션 UI를 결합해 접근성 높은 해석 경험을 제공합니다. 사용자는 복잡한 개념을 빠르게 이해하고,
          자신의 상황에 맞는 실천 포인트를 얻을 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>2. 콘텐츠 제작 원칙</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          콘텐츠는 중복/복사 문구를 지양하고 자체 서술 원칙을 따릅니다. 결과형 페이지 외에도 사주 원리, 타로 상징, 해석 방법론 등
          정보성 글을 지속 보강하며, 작성/수정 이력을 투명하게 공개합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>3. 책임 있는 안내</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          본 서비스의 해석은 법률, 의료, 투자, 세무 자문을 대체하지 않습니다. 중요한 의사결정은 반드시 해당 분야 전문가의 검토를
          우선하시기 바랍니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>4. 운영 및 문의</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          서비스명: Code Destiny
          <br />
          문의 이메일: seongbae555@gmail.com
          <br />
          Contact: seongbae555@gmail.com
        </p>
      </section>
    </main>
  );
}
