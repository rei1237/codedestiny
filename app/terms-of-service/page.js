import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../lib/site-policy-config";

export function generateMetadata() {
  const metadata = generatePageMetadata({
    path: "/terms",
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용 규칙, 면책, 책임 제한 및 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "서비스 책임 제한", "면책"],
  });

  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/terms",
    },
  };
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
        시행일: 2026-04-11 / Effective Date: 2026-04-11
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
          운영자: {OPERATOR_NAME}
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
          특히 의료적 진단/치료 결과, 법률 분쟁 또는 형사 사건의 결과, 투자 수익 또는 손실 회피를 보장하지 않습니다.
          In particular, we do not guarantee medical outcomes, legal dispute or criminal case results, or investment returns.
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

      <section id="refund-policy" style={{ ...sectionStyle, marginBottom: "14px", scrollMarginTop: "116px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>11. 교환/환불(청약철회) 및 구독형 디지털 콘텐츠 환불 제한 / Exchange, Refund and Subscription Withdrawal Limits</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 서비스의 구독은 30일 주기 정기결제(자동 갱신) 구조로 운영될 수 있으며,
          서비스 정책에 따라 등록된 결제수단 또는 사전 충전된 유상 포인트에서 차기 이용요금이 자동 결제(또는 자동 차감)될 수 있습니다.
          Subscription may operate on a 30-day recurring cycle, and renewal fees may be automatically charged according to service policy.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 다음 갱신일 전까지 구독 해지(자동 갱신 중단)를 요청할 수 있으며,
          해지 효력은 원칙적으로 다음 결제주기부터 발생합니다(이미 결제된 당기 이용기간은 별도 약정/법령에 따름).
          Cancellation before the next renewal takes effect from the following billing cycle in principle.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          구독 서비스 가입 후 멤버십 전용 콘텐츠(구독 혜택으로 제공되는 유료 콘텐츠 포함)를 1회라도 열람하면,
          전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항 제5호의
          디지털 콘텐츠 서비스 개시로 간주됩니다.
          In such cases, the digital content service is deemed to have started under applicable law.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          따라서 구독 후 7일 이내라 하더라도 해당 이용 기록이 확인되면 단순 변심에 의한 전액 환불은 제한되며,
          이용 횟수, 이용 기간, 제공된 혜택, 결제대행 수수료 등 합리적 공제 기준을 반영한 잔여분만 환불됩니다.
          Full refund may be restricted once usage starts, and only the refundable remainder may be returned.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          환불이 가능한 경우에도 관계 법령, 결제대행사 정책, 카드사/플랫폼 정책에 따라
          취소 수수료 또는 이용분 공제가 발생할 수 있으며, 실제 환불 금액/시점은 결제수단별 정산 주기에 따릅니다.
          Refund amount and timing may vary based on legal requirements and payment processor settlement rules.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          미사용 유상 포인트는 전자상거래 관련 법령에 따라 <strong>&#39;7일이내청약철회 가능&#39;</strong> 기준으로 환불 접수할 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          멤버십 전용 콘텐츠 진입 시 표시되는 안내 팝업에서 확인 버튼을 누르는 행위는,
          서비스 이용 개시 및 환불 제한 조건에 대한 전자적 동의로 간주됩니다.
          Pressing Confirm in the notice popup constitutes explicit electronic consent.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          회사는 분쟁 예방과 법령 준수를 위해 팝업 확인 시각, 콘텐츠 식별 정보, 계정 식별자, 접속 기록 등
          필요한 범위의 로그를 보관할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>12. 무료 체험 및 정기결제(자동 갱신) 전환 / Free Trial and Recurring Billing Conversion</h2>
        <p style={{ lineHeight: 1.75 }}>
          무료 체험 기간 중이라도 멤버십 전용 콘텐츠를 열람하여 서비스 이용이 개시된 경우,
          이후 유료 전환(자동 결제 포함) 직후에는 단순 변심에 의한 즉시 환불이 제한될 수 있습니다.
          If service use starts during the free trial, immediate post-conversion refund may be restricted.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          자동 갱신 여부, 결제 주기, 차기 결제 예정일, 해지 방법 등 핵심 조건은 결제/구독 화면에 고지되며,
          이용자는 결제 완료 전 이를 확인할 책임이 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          다만 강행규정에 따라 환불이 필요한 경우에는 관계 법령 및 결제대행사 정책에 따라 처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>13. 약관 변경 / Changes to Terms</h2>
        <p style={{ lineHeight: 1.75 }}>
          약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다.
          Material changes will be announced with a reasonable prior notice period when required.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>14. 준거법 및 관할 / Governing Law and Jurisdiction</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다.
          These Terms are governed by the laws of the Republic of Korea.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>15. 문의 / Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스명: Code Destiny
          <br />
          사이트: https://code-destiny.com
          <br />
          운영자: {OPERATOR_NAME}
          <br />
          약관 문의: {SUPPORT_EMAIL}
          <br />
          Terms inquiries: {SUPPORT_EMAIL}
        </p>
      </section>
    </main>
  );
}
