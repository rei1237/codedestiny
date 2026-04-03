import { generatePageMetadata } from "../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/terms-of-service",
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용 규칙, 면책, 책임 제한 및 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "서비스 책임 제한", "면책"],
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

export default function TermsOfServicePage() {
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
        이용약관 (Terms of Service)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-03-16 / Effective Date: 2026-03-16
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 약관의 목적 / Purpose</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 약관은 Code Destiny가 제공하는 온라인 서비스의 이용 조건과 절차, 당사자 간 권리·의무 및 책임사항을 규정합니다.
          These terms govern access to and use of Code Destiny services, including rights, obligations, and liabilities.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 적용 대상 및 동의 / Scope and Acceptance</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자가 서비스에 접속하거나 이용을 계속하는 경우 본 약관 및 관련 정책(개인정보처리방침 포함)에 동의한 것으로 봅니다.
          By accessing or using the service, you agree to these Terms and related policies.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 서비스 내용 / Service Description</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny는 사주/타로/운세 기반의 해석 콘텐츠를 제공하며, 서비스 품질 향상을 위해 기능이 추가/변경/중단될 수 있습니다.
          We may update features, modify content, or suspend parts of the service without prior notice when reasonably required.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          서비스 주소: https://code-destiny.com
          <br />
          운영자: 꽃돼지 연이
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 쿠키 및 제3자 광고 / Cookies and Third-Party Ads</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스는 기능 제공, 이용 통계, 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense를 포함한 제3자 광고 네트워크는
          사용자 관심사 기반 광고를 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정 또는 Google 광고 설정에서 이를 관리할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 이용자 자격 및 책임 / Eligibility and User Responsibility</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 정확한 정보 입력 및 계정/기기 보안 관리 책임을 부담하며, 법령 위반, 권리 침해, 자동화된 비정상 접근, 서비스 방해
          행위를 해서는 안 됩니다. Users are responsible for lawful and fair use of the service.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 금지행위 / Prohibited Conduct</h2>
        <p style={{ lineHeight: 1.75 }}>
          (1) 서비스 역설계, 크롤링, 무단 자동화 접근 (2) 악성코드 유포 및 보안 취약점 악용 (3) 타인의 개인정보 무단 수집/도용
          (4) 불법 콘텐츠 게시 (5) 운영을 방해하는 일체의 행위는 금지됩니다. We may block or suspend access for violations.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 지식재산권 / Intellectual Property</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스와 관련된 텍스트, 디자인, 코드, 데이터 구성요소 등 일체의 권리는 Code Destiny 또는 정당한 권리자에게 귀속됩니다.
          You may not reproduce, distribute, or commercially exploit content without permission unless allowed by law.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 서비스 성격 및 한계 / Nature and Limitations</h2>
        <p style={{ lineHeight: 1.75 }}>
          운세/타로 결과는 오락 및 참고 목적의 정보이며, 법률/의료/투자/세무 등 전문 자문을 대체하지 않습니다.
          Fortune interpretations are informational entertainment content and do not guarantee outcomes.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>9. 면책 / Disclaimer</h2>
        <p style={{ lineHeight: 1.75 }}>
          회사는 천재지변, 통신장애, 플랫폼/브라우저 문제, 제3자 서비스 중단 등 불가항력 사유로 인한 손해에 대해 책임을 지지 않습니다.
          We do not warrant uninterrupted, error-free service at all times.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>10. 책임 제한 / Limitation of Liability</h2>
        <p style={{ lineHeight: 1.75 }}>
          관련 법령이 허용하는 최대 범위 내에서 회사의 책임은 제한되며, 간접손해/특별손해/결과적 손해에 대한 책임은 배제될 수 있습니다.
          Nothing in these Terms excludes liability that cannot be excluded under applicable law.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>11. 약관 변경 / Changes to Terms</h2>
        <p style={{ lineHeight: 1.75 }}>
          약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다.
          Material changes will be announced with a reasonable prior notice period when required.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>12. 준거법 및 관할 / Governing Law and Jurisdiction</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다.
          These Terms are governed by the laws of the Republic of Korea.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>13. 문의 / Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스명: Code Destiny
          <br />
          사이트: https://code-destiny.com
          <br />
          운영자: 꽃돼지 연이
          <br />
          약관 문의: seongbae555@gmail.com
          <br />
          Terms inquiries: seongbae555@gmail.com
        </p>
      </section>
    </main>
  );
}
