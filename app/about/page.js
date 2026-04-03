import { generatePageMetadata } from "../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/about",
    title: "About Code Destiny — 서비스 소개 | Code Destiny",
    description:
      "꿀꿀 만세력(Code Destiny)은 사주·타로·점성술·자미두수·숙요점 등 20가지 이상의 운세를 모두 무료로 제공합니다. 서비스 목적·운영 원칙·문의 채널을 확인하세요.",
    keywords: ["Code Destiny", "꿀꿀 만세력", "무료 운세 플랫폼", "서비스 소개", "운영자", "Google AdSense"],
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
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>운영자 및 서비스 정보</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          사이트 주소: https://code-destiny.com
          <br />
          운영자: 꽃돼지 연이
          <br />
          주요 제공 서비스: 사주, 타로, 점성술, 자미두수, 숙요점 기반 정보성 콘텐츠 및 해석 도구
        </p>
      </section>

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
          운영자: 꽃돼지 연이
          <br />
          문의 이메일: seongbae555@gmail.com
          <br />
          Contact: seongbae555@gmail.com
        </p>
      </section>

      <section style={{ ...sectionStyle, marginTop: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>
          5. 광고 및 쿠키 고지
        </h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          본 서비스는 운영 재원을 위해 Google AdSense를 포함한 제3자 광고를 노출할 수 있으며, 관련 광고 제공 과정에서 쿠키가 사용될 수 있습니다.
          이용자는 브라우저 설정 또는 Google 광고 설정을 통해 맞춤 광고 관련 선택을 관리할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginTop: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f8fafc" }}>
          6. 저자 전문성 (E-E-A-T)
        </h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          꽃돼지 연이는 감성적 통찰을 존중하면서도, 백사자 쌈바의 실행력으로 결과를 현실 전략으로 전환합니다.
          Code: Destiny의 사주·운세·타로·명리학 콘텐츠는 단순한 분위기형 문구가 아니라, 데이터 구조와 해석 프레임을
          결합한 실천형 가이드를 지향합니다. 꿀꿀 사주, 꿀꿀 운세, 꿀꿀 만세력 문맥에서 사용자 상황에 맞는 선택지를
          제시하고, 이해하기 쉬운 언어로 행동 포인트를 정리하는 것이 핵심 운영 원칙입니다.
        </p>
      </section>
    </main>
  );
}
