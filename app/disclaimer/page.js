import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/disclaimer",
    title: "Disclaimer | 면책 고지 — Code Destiny",
    description:
      "Code Destiny 면책 고지 페이지입니다. 서비스 정보의 성격, 비보장 항목, 책임 제한, 전문 자문 권고, 긴급 상황 대응 원칙을 안내합니다.",
    keywords: ["Disclaimer", "면책 고지", "운세 면책", "법률 고지", "전문가 자문"],
  });
}

const sectionStyle = {
  background: "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

export default function DisclaimerPage() {
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
        면책 고지 (Disclaimer)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-05-07 / Effective Date: 2026-05-07
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 본 고지의 목적 / Purpose of this Disclaimer</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 문서는 Code Destiny에서 제공하는 콘텐츠의 성격과 한계를 명확히 안내하기 위한 고지입니다. 이용자는 본 고지를 통해
          서비스의 정보가 어떤 범위에서 활용되어야 하는지 이해할 수 있습니다. This page clarifies the scope and limitations of information
          provided on Code Destiny.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 정보의 성격 / Nature of the Content</h2>
        <p style={{ lineHeight: 1.75 }}>
          사주, 타로, 점성술, 오라클 및 관련 해석은 오락·자기 성찰·관점 확장 목적의 참고 정보입니다. 결과 문구는 확정된 사실 또는
          미래 사건의 보증이 아니며, 개인 상황에 따라 다르게 해석될 수 있습니다. Fortune readings are for entertainment and self-reflection,
          not factual guarantees.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 전문 자문 대체 불가 / Not a Substitute for Professional Advice</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 서비스는 의학, 법률, 투자, 세무, 정신건강, 심리치료 등 전문 자문을 대체하지 않습니다. 건강 이상, 법적 분쟁, 자산 운용,
          중대한 계약 체결 등 중요한 의사결정은 반드시 해당 자격을 갖춘 전문가와 상담한 후 진행하시기 바랍니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          This service does not replace professional medical, legal, financial, tax, or mental health advice. Consult qualified professionals
          before making high-impact decisions.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 비보장 항목 / No-Guarantee Statement</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny는 다음 결과를 보장하지 않습니다.
          (1) 의료 진단·치료의 성공 또는 회복 결과,
          (2) 민사·형사 사건을 포함한 법적 절차의 결과,
          (3) 투자 수익, 원금 보전, 손실 회피,
          (4) 취업·승진·시험·관계 회복 등 특정 사건의 성사 여부.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny does not guarantee medical outcomes, legal results (including criminal cases), investment returns, or specific life-event outcomes.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 이용자 책임 / User Responsibility</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스 콘텐츠를 참고하여 이루어진 최종 판단과 행동의 책임은 이용자 본인에게 있습니다. 운영자는 이용자의 개별 상황에서 발생한
          직접·간접 손해, 기회손실, 결과적 손해에 대해 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 외부 링크 및 제3자 서비스 / External Links and Third-Party Services</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스에는 외부 웹사이트, 결제사, 광고 네트워크, 분석 도구로 연결되는 링크가 포함될 수 있습니다. 외부 서비스의 내용, 약관,
          개인정보 처리 방식은 각 제공자의 정책이 적용되며, 당사는 해당 영역을 통제하지 않습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 긴급 상황 고지 / Emergency Notice</h2>
        <p style={{ lineHeight: 1.75 }}>
          생명·신체 위험, 자해·타해 우려, 범죄 피해 우려, 즉시 의료 처치가 필요한 경우에는 본 서비스를 이용해 판단하지 마시고,
          지역 응급기관 또는 전문기관에 즉시 연락해 주세요.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          In emergencies involving health or safety risks, contact emergency services or qualified professionals immediately.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 문의 / Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          고지 관련 문의: <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>{SUPPORT_EMAIL}</a>
          <br />
          Disclaimer inquiries: <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </main>
  );
}