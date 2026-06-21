import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/editorial-policy",
    title: "콘텐츠 제작 및 AI 활용 고지 | Code Destiny",
    description:
      "Code Destiny의 운세 콘텐츠 제작 원칙, AI 활용 범위, 검수 기준, 광고와 편집 독립성, 정정 요청 절차를 안내합니다.",
    keywords: ["콘텐츠 제작 원칙", "AI 활용 고지", "운세 콘텐츠", "편집 정책", "Code Destiny"],
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
const linkStyle = { color: "#93c5fd", textDecoration: "underline" };

export default function EditorialPolicyPage() {
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
        콘텐츠 제작 및 AI 활용 고지
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-06-21 / Effective Date: 2026-06-21
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 제작 원칙</h2>
        <p style={paragraphStyle}>
          Code Destiny는 사주, 자미두수, 숙요점, 점성술, 베다점, 타로, 마야 달력, 명상 음악과 관련된 콘텐츠를 사용자가 스스로의 흐름을 차분히 이해하도록 돕는 참고 자료로 제작합니다. 각 글은 단순 키워드 나열이 아니라 해석 기준, 사용 상황, 주의할 점, 관련 기능으로 이어지는 안내를 함께 담는 것을 원칙으로 합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. AI 활용 범위</h2>
        <p style={paragraphStyle}>
          AI 도구는 초안 정리, 문장 다듬기, 구조화, 번역 보조, 반복 표현 점검에 사용될 수 있습니다. 다만 게시 전에는 Code Destiny의 콘텐츠 기준에 맞춰 과장 표현, 불안 조장, 확정적 예언, 의료·법률·금융 조언처럼 오해될 수 있는 문장을 검토합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 고유성과 품질 기준</h2>
        <p style={paragraphStyle}>
          얇은 자동 생성 문서, 문장만 바꾼 중복 페이지, 외부 자료의 단순 요약은 게시 기준에 맞지 않습니다. 외부 자료나 전통 체계를 참고하는 경우에도 Code Destiny의 해석 기준, 비교 설명, 예시, 한계 고지를 더해 독립적인 정보 가치를 갖도록 관리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 운세 표현 안전 기준</h2>
        <p style={paragraphStyle}>
          운세 문장은 &ldquo;반드시 성공한다&rdquo;, &ldquo;무조건 이혼한다&rdquo;, &ldquo;특정 달에 병이 생긴다&rdquo;, &ldquo;투자하면 돈을 번다&rdquo;처럼 현실 판단을 대신하는 단정으로 쓰지 않습니다. &ldquo;이런 흐름으로 해석할 수 있다&rdquo;, &ldquo;현실적 판단과 함께 참고하라&rdquo;처럼 조언형 문장을 우선합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 광고와 편집 독립성</h2>
        <p style={paragraphStyle}>
          광고, 제휴 링크, 결제 상품의 존재가 운세 해석의 결론이나 콘텐츠 순위를 결정하지 않습니다. 광고는 충분한 본문이 있는 공개 정보 페이지에 한해 사용자를 방해하지 않는 방식으로 배치하며, 로그인, 결제, 개인 결과, 로딩, 오류, 관리자 화면에는 광고를 배치하지 않는 것을 원칙으로 합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 정정과 문의</h2>
        <p style={paragraphStyle}>
          부정확한 설명, 깨진 문장, 과장 표현, 출처가 불명확한 내용, 개인에게 불안을 줄 수 있는 문구를 발견하면 문의해 주십시오. 검토 후 필요한 경우 내용을 수정하거나 보강합니다.
        </p>
        <p style={paragraphStyle}>
          콘텐츠 문의: <a href={SUPPORT_MAILTO} style={linkStyle}>{SUPPORT_EMAIL}</a>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 관련 정책</h2>
        <p style={paragraphStyle}>
          개인정보와 쿠키는 <Link href="/privacy" style={linkStyle}>개인정보처리방침</Link>, 운세와 상담형 콘텐츠의 한계는{" "}
          <Link href="/disclaimer" style={linkStyle}>면책 고지</Link>, 광고 운영 원칙은{" "}
          <Link href="/advertising-policy" style={linkStyle}>광고 운영정책</Link>에서 함께 확인할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
