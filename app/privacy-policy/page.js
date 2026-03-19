export const metadata = {
  title: "Privacy Policy | 개인정보처리방침",
  description:
    "Code Destiny 개인정보처리방침 페이지입니다. 쿠키 사용, 광고 제공, 개인정보 처리 목적과 이용자 권리를 안내합니다.",
  keywords: ["Privacy Policy", "개인정보처리방침", "쿠키", "애드센스", "Google AdSense"],
  alternates: {
    canonical: "/privacy-policy",
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

export default function PrivacyPolicyPage() {
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
        개인정보처리방침 (Privacy Policy)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-03-16 / Effective Date: 2026-03-16
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 총칙 / General Notice</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며 관련 법령(예: 대한민국 개인정보 보호법, 정보통신망법 등)을
          준수하기 위해 노력합니다. This Privacy Policy explains what data we process, why we process it, how long we keep it,
          and how you can exercise your rights.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 처리 목적 및 법적 근거 / Purpose and Legal Basis</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스는 운세/타로 결과 제공, 개인화된 화면 제공, 서비스 개선, 보안 및 부정 이용 방지, 고객 문의 대응, 법적 의무 이행 목적에서
          개인정보를 처리합니다. We process personal data based on your consent, contract-like necessity for service delivery,
          legitimate interests (security/analytics), and legal obligations where applicable.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 수집하는 정보 항목 / Categories of Data We Process</h2>
        <p style={{ lineHeight: 1.75 }}>
          입력 정보(예: 생년월일, 출생시간, 성별), 접속기기 정보(IP, 브라우저/OS, 언어, 접속시간), 로그 정보, 쿠키/로컬스토리지 식별자,
          문의 시 제공되는 이메일 및 메시지 내용이 포함될 수 있습니다. We do not intentionally collect sensitive personal data beyond
          what is required for the fortune analysis experience.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 쿠키, 분석 및 광고 / Cookies, Analytics and Ads</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스는 원활한 기능 제공과 이용 패턴 분석을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense 등 제3자 파트너가
          광고 제공 목적으로 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정 및 Google 광고 설정 페이지를 통해 맞춤 광고를 관리할 수 있습니다.
          You can disable cookies in your browser, but parts of the service may not function properly.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 개인정보의 제3자 제공 및 처리위탁 / Third-Party Sharing and Processors</h2>
        <p style={{ lineHeight: 1.75 }}>
          원칙적으로 이용자 동의 없이 개인정보를 제3자에게 판매하지 않습니다. 다만 광고, 호스팅, 분석, 이메일 처리 등 서비스 운영을 위해
          신뢰 가능한 수탁사(클라우드/분석/메일/광고 네트워크)에 처리 위탁이 이루어질 수 있습니다. In such cases, we require contractual
          safeguards and limit processing to the minimum necessary scope.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 국외 이전 가능성 / International Data Transfers</h2>
        <p style={{ lineHeight: 1.75 }}>
          클라우드 인프라 또는 분석/광고 도구의 특성상 데이터가 해외 서버에서 처리될 수 있습니다. We take reasonable measures to protect
          transferred data through standard contractual and technical safeguards where available.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 보유기간 및 파기 / Retention and Deletion</h2>
        <p style={{ lineHeight: 1.75 }}>
          개인정보는 수집 목적 달성 시 지체 없이 삭제하며, 관련 법령이 보관을 요구하는 경우 해당 기간 동안 안전하게 보관 후 파기합니다.
          예시: 소비자 불만/분쟁 처리 기록(최대 3년), 접속 로그(최대 3개월) 등. Retention periods may vary by legal requirements.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 이용자 권리와 행사 방법 / Your Rights</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다. Requests are handled without undue delay after
          reasonable identity verification and within the scope permitted by law.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>9. 아동의 개인정보 / Children's Privacy</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스는 원칙적으로 만 14세 미만 아동을 대상으로 하지 않으며, 관련 정보가 수집된 사실을 인지한 경우 지체 없이 삭제 조치합니다.
          If you believe a child has provided personal data, please contact us immediately.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>10. 안전성 확보 조치 / Security Measures</h2>
        <p style={{ lineHeight: 1.75 }}>
          접근권한 최소화, 접근통제, 로그 모니터링, 전송 구간 보호 등 합리적인 기술적/관리적 보호조치를 운영합니다. No method of
          transmission or storage is 100% secure, but we continuously improve safeguards.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>11. 정책 변경 / Changes to this Policy</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 중요한 변경 사항은 서비스 내 공지 또는 링크된 페이지를 통해 안내합니다.
          Continued use of the service after updates means you acknowledge the revised policy.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>12. 개인정보 문의처 / Privacy Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스명: Code Destiny
          <br />
          개인정보 보호 문의 이메일: seongbae555@gmail.com
          <br />
          Contact Email: seongbae555@gmail.com
        </p>
      </section>
    </main>
  );
}
