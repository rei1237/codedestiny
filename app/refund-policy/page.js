import { generatePageMetadata } from "../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/refund-policy",
    title: "Refund Policy | 환불 규정 — Code Destiny",
    description:
      "Code Destiny 환불 규정 페이지입니다. 디지털 콘텐츠 및 코인성 유료 기능의 취소·환불 기준과 예외를 안내합니다.",
    keywords: [
      "Refund Policy",
      "환불 규정",
      "디지털 콘텐츠 환불",
      "유료 기능 취소",
      "전자상거래법",
    ],
  });
}

const sectionStyle = {
  background:
    "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow:
    "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

export default function RefundPolicyPage() {
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
        환불 규정 (Refund Policy)
      </h1>
      <p
        style={{
          opacity: 0.92,
          lineHeight: 1.82,
          marginBottom: "20px",
          color: "#dbe5ff",
          wordBreak: "keep-all",
        }}
      >
        시행일: 2026-04-01 / Effective Date: 2026-04-01
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          1. 적용 범위 / Scope
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          본 규정은 Code Destiny 서비스에서 제공하는 유료 디지털 기능(예: 코인성
          기능, 프리미엄 잠금 해제 등)의 결제 취소 및 환불 기준을 안내합니다.
          무료 콘텐츠 이용에는 별도 결제 취소/환불 절차가 적용되지 않습니다.
          This policy applies to paid digital features only.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          2. 기본 원칙 / General Rule
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          디지털 콘텐츠의 특성상 결과가 즉시 제공되거나 코인이 사용된 경우에는
          원칙적으로 환불이 제한될 수 있습니다. 다만 관련 법령(전자상거래
          등에서의 소비자보호에 관한 법률 등)에서 요구하는 범위에서는 이용자의
          권리를 우선하여 처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          3. 환불 가능 기준 / Eligible Cases
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          아래 사유에 해당하는 경우 환불 심사를 진행합니다.
          <br />
          (1) 결제 직후 코인/유료 기능이 정상 지급되지 않은 경우
          <br />
          (2) 중복 결제, 오결제, 시스템 장애로 인한 과금 오류가 확인되는 경우
          <br />
          (3) 법령상 청약철회 또는 환불이 가능한 기간/사유에 해당하는 경우
          <br />
          (4) 기타 당사가 합리적으로 환불 필요성을 인정하는 경우
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          4. 환불 제한 기준 / Non-Refundable Cases
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          다음의 경우 환불이 제한될 수 있습니다.
          <br />
          (1) 지급된 코인 또는 유료 기능을 이미 사용한 경우
          <br />
          (2) 이용자 책임 사유(기기 변경, 단순 변심, 네트워크 환경 문제 등)로
          결과 이용이 어려운 경우
          <br />
          (3) 약관 위반, 비정상 이용, 부정 결제 시도가 확인된 경우
          <br />
          단, 제한 사유가 있더라도 관련 법령에 따라 환불이 필요한 부분은 예외로
          처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          5. 부분 환불 및 정산 / Partial Refund and Settlement
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          코인형 상품의 경우 전체 사용분을 제외한 잔여 미사용분에 대해 부분
          환불이 가능할 수 있으며, 결제 수단 수수료·프로모션 혜택·부정 이용
          여부를 반영해 최종 환불액이 산정됩니다. 환불은 원 결제수단 취소를
          원칙으로 합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          6. 환불 요청 방법 / How to Request
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          환불 요청은 문의 채널을 통해 접수할 수 있으며, 아래 정보를 함께
          제공해주시면 처리 속도가 빨라집니다.
          <br />
          - 결제 일시, 결제 수단, 결제 금액
          <br />
          - 문제 상황 설명 및 오류 화면(가능한 경우)
          <br />
          - 계정 식별 정보(이메일 등)
          <br />
          접수 후 영업일 기준 3~7일 내 1차 회신을 원칙으로 하며, 결제사/플랫폼
          사정에 따라 환불 반영까지 추가 시일이 소요될 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          7. 미성년자 결제 / Minors
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          미성년자의 결제는 관련 법령에 따라 법정대리인의 동의 여부를 확인할 수
          있으며, 필요한 경우 증빙 서류 제출을 요청할 수 있습니다. 법령상 취소
          가능 사유가 확인되면 이에 맞춰 처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          8. 분쟁 처리 / Dispute Resolution
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          환불 처리 결과에 이의가 있는 경우 고객 문의 채널로 재심을 요청할 수
          있습니다. 당사는 합리적 자료를 바탕으로 재검토하며, 필요한 경우 관계
          법령 및 분쟁조정 절차에 따릅니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
          9. 환불 문의처 / Refund Contact
        </h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스명: Code Destiny
          <br />
          환불 문의: seongbae555@gmail.com
          <br />
          Refund inquiries: seongbae555@gmail.com
        </p>
      </section>
    </main>
  );
}
