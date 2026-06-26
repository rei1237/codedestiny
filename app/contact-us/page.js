import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

const CONTACT_US_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact Us | 문의하기 — Code Destiny",
    description: "Code Destiny 문의 페이지입니다. 이메일 및 문의 폼으로 서비스 관련 문의를 접수할 수 있습니다.",
    keywords: ["Contact Us", "문의하기", "고객지원", "Code Destiny 문의"],
  },
  en: {
    title: "Contact Us | Code Destiny",
    description: "Contact Code Destiny by email or inquiry form for service support.",
    keywords: ["Contact Us", "Support", "Customer Support", "Code Destiny Contact"],
  },
  ja: {
    title: "お問い合わせ | Code Destiny",
    description: "Code Destinyへのサービス関連のお問い合わせを、メールまたはフォームで受け付けています。",
    keywords: ["お問い合わせ", "サポート", "カスタマーサポート", "Code Destiny お問い合わせ"],
  },
};

export function generateMetadata() {
  const copy = CONTACT_US_PAGE_TEXT_TRANSLATIONS.ko;
  const metadata = generatePageMetadata({
    path: "/contact",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });

  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/contact",
    },
  };
}

const cardStyle = {
  background:
    "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

const inputStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid rgba(148, 163, 184, 0.38)",
  background: "rgba(2, 6, 23, 0.66)",
  color: "#e2e8f0",
  padding: "10px 12px",
};

export default function ContactUsPage() {
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
        문의하기 (Contact Us)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        Code Destiny 서비스 관련 일반 문의, 오류 신고, 개인정보 권리행사 요청, 제휴 문의를 아래 채널로 접수할 수 있습니다.
      </p>

      <section style={{ ...cardStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>이메일 문의 / Email Contact</h2>
        <p style={{ lineHeight: 1.82, marginBottom: "8px", color: "#dbe5ff", wordBreak: "keep-all" }}>
          서비스명: Code Destiny
          <br />
          운영 이메일:{" "}
          <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          평균 회신 시간: 영업일 기준 1~3일 / Typical response time: 1-3 business days.
        </p>
      </section>

      <section style={{ ...cardStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>문의 유형 / Inquiry Categories</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          일반 문의(서비스 이용/오류), 개인정보 요청(열람/정정/삭제/처리정지/동의철회), 권리침해 신고, 제휴 및 비즈니스 문의를 접수합니다.
          Please include your request type in the subject line for faster handling.
        </p>
      </section>

      <section style={{ ...cardStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>개인정보 요청 안내 / Privacy Request Guide</h2>
        <p style={{ lineHeight: 1.82, color: "#dbe5ff", wordBreak: "keep-all" }}>
          개인정보 관련 요청 시 본인 확인을 위해 최소한의 추가 정보를 요청할 수 있습니다. 법령상 보존 의무가 있는 데이터는 즉시 삭제가
          제한될 수 있으며, 처리 결과를 회신 메일로 안내합니다. We will process valid requests as promptly as reasonably possible.
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>간단 문의 폼 / Quick Contact Form</h2>
        <form
          action={SUPPORT_MAILTO}
          method="post"
          encType="text/plain"
          style={{ display: "grid", gap: "10px" }}
        >
          <label>
            <span style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>이름 / Name</span>
            <input type="text" name="name" style={inputStyle} required />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>이메일 / Email</span>
            <input type="email" name="email" style={inputStyle} required />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>문의 내용 / Message</span>
            <textarea name="message" rows={6} style={inputStyle} required />
          </label>
          <button
            type="submit"
            style={{
              marginTop: "6px",
              borderRadius: "10px",
              border: "1px solid rgba(96, 165, 250, 0.45)",
              background: "linear-gradient(90deg, rgba(30, 64, 175, 0.9), rgba(37, 99, 235, 0.92))",
              color: "#eff6ff",
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            메일 앱으로 보내기 / Send via Email App
          </button>
        </form>
        <p style={{ lineHeight: 1.7, marginTop: "12px", opacity: 0.86 }}>
          본 폼으로 제출된 내용은 문의 처리 목적 범위에서만 사용됩니다. 민감정보, 비밀번호, 결제정보 등 불필요한 개인정보는 입력하지 마세요.
          Please avoid sharing unnecessary sensitive data.
        </p>
      </section>
    </main>
  );
}
