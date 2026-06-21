import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { OPERATOR_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/privacy",
    title: "개인정보처리방침 | Code Destiny",
    description:
      "Code Destiny 개인정보처리방침입니다. 개인정보 수집 목적, 보관 기간, 쿠키와 광고 식별자, Google 광고 파트너 고지, 이용자 권리와 문의 방법을 안내합니다.",
    keywords: ["개인정보처리방침", "쿠키", "광고 식별자", "Google AdSense", "개인정보 삭제"],
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

const paragraphStyle = { lineHeight: 1.78, wordBreak: "keep-all" };

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
        개인정보처리방침
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-06-21 / Effective Date: 2026-06-21
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 기본 원칙</h2>
        <p style={paragraphStyle}>
          Code Destiny는 운세, 리포트, 상담형 콘텐츠를 제공하는 과정에서 필요한 개인정보를 최소한으로 처리하며, 수집 목적과 보관 기간을 명확히 알리기 위해 이 방침을 공개합니다.
        </p>
        <p style={paragraphStyle}>
          개인정보 처리자: {OPERATOR_NAME}
          <br />
          사이트: https://code-destiny.com
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 수집 항목과 이용 목적</h2>
        <p style={paragraphStyle}>
          생년월일, 성별, 출생시간, 출생지 등 운세 계산에 필요한 입력값은 사주, 점성술, 타로, 숙요점, 리포트 결과를 생성하기 위해 사용됩니다. 이메일, 프로필 정보, 문의 내용은 계정 관리, 고객 응대, 알림 발송, 부정 이용 방지에 사용될 수 있습니다.
        </p>
        <p style={paragraphStyle}>
          결제 정보는 결제 처리, 환불, 영수증 발행, 이용권 확인을 위해 결제 대행사와 함께 처리될 수 있으며, Code Destiny는 카드번호 전체와 같은 민감한 결제 원문을 직접 저장하지 않습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 자동으로 처리되는 정보</h2>
        <p style={paragraphStyle}>
          접속 IP, 브라우저와 운영체제 정보, 접속 시간, 언어 설정, 기기 식별 정보, 쿠키와 로컬 저장소 값, 페이지 이용 기록이 서비스 안정성, 보안 점검, 오류 분석, 이용 통계 확인을 위해 처리될 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 쿠키, 광고 식별자, Google 광고 고지</h2>
        <p style={paragraphStyle}>
          Code Destiny는 로그인 유지, 보안, 이용 통계, 광고 제공을 위해 쿠키와 유사 기술을 사용할 수 있습니다. Google을 포함한 제3자 광고 파트너는 광고 제공의 결과로 이용자의 브라우저에 쿠키를 저장하거나 읽을 수 있으며, 웹 비콘, IP 주소, 광고 식별자와 같은 정보를 사용할 수 있습니다.
        </p>
        <p style={paragraphStyle}>
          Google과 그 파트너는 이용자의 이전 방문 기록을 바탕으로 맞춤 광고를 제공할 수 있습니다. 이용자는 브라우저 설정, 기기 광고 설정,{" "}
          <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Google 광고 설정
          </a>
          에서 맞춤 광고를 관리할 수 있습니다.
        </p>
        <p style={paragraphStyle}>
          Google이 파트너 사이트와 앱의 정보를 사용하는 방식은{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            Google 파트너 사이트/앱 데이터 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 제3자 제공과 처리 위탁</h2>
        <p style={paragraphStyle}>
          Code Destiny는 이용자의 동의 없이 개인정보를 판매하지 않습니다. 다만 결제 처리, 클라우드 호스팅, 보안, 분석, 이메일 발송, 광고 제공처럼 서비스 운영에 필요한 경우에는 해당 목적에 필요한 범위에서 외부 처리자 또는 광고 파트너가 정보를 처리할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 보관 기간</h2>
        <p style={paragraphStyle}>
          입력값과 결과 데이터는 서비스 제공, 재열람, 오류 대응에 필요한 기간 동안 보관되며, 이용자가 삭제를 요청하거나 목적이 달성되면 지체 없이 파기합니다. 문의 기록은 분쟁 대응을 위해 최대 3년, 접속 로그는 보안과 부정 이용 방지를 위해 최대 3개월, 결제 기록은 관계 법령이 요구하는 기간 동안 보관될 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 이용자 권리</h2>
        <p style={paragraphStyle}>
          이용자는 개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회를 요청할 수 있습니다. 요청은 합리적인 본인 확인 절차 후 관련 법령이 허용하는 범위에서 처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 아동 개인정보</h2>
        <p style={paragraphStyle}>
          Code Destiny는 만 13세 미만 아동을 대상으로 하지 않습니다. 만 13세 미만 아동의 개인정보가 수집되었다고 판단되면 아래 문의처로 알려 주십시오. 확인 후 필요한 삭제 조치를 진행합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>9. 민감한 해석과 광고 타겟팅</h2>
        <p style={paragraphStyle}>
          건강, 재정, 관계, 법률성 해석은 사용자의 자기 이해를 돕는 참고 콘텐츠로만 제공됩니다. Code Destiny는 이러한 민감한 해석 내용을 이용해 사용자를 불안하게 만들거나, 개인 맞춤 광고 타겟팅과 부적절하게 연결하지 않도록 주의합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>10. 보안 조치</h2>
        <p style={paragraphStyle}>
          접근 권한 제한, 전송 구간 보호, 로그 점검, 부정 이용 탐지 등 합리적인 기술적·관리적 보호 조치를 적용합니다. 다만 인터넷 전송과 저장 방식은 절대적인 안전을 보장할 수 없으므로 지속적으로 개선합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>11. 방침 변경</h2>
        <p style={paragraphStyle}>
          이 방침은 법령, 서비스, 광고 파트너 정책 변경에 따라 개정될 수 있습니다. 중요한 변경 사항은 이 페이지에 반영하며, 필요한 경우 서비스 내 공지 또는 별도 안내로 알립니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>12. 개인정보 문의</h2>
        <p style={paragraphStyle}>
          개인정보 열람, 정정, 삭제, 처리 정지, 광고·쿠키 관련 문의는 아래 이메일로 연락해 주십시오.
          <br />
          <a href={SUPPORT_MAILTO} style={{ color: "#93c5fd", textDecoration: "underline" }}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </main>
  );
}
