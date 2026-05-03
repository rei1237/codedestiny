/**
 * FooterLegal — 푸터 법적 고지 HTML 스니펫
 * 저장 경로: app/components/FooterLegal.jsx
 *
 * 사용법:
 *   import FooterLegal from "@/app/components/FooterLegal";
 *   <FooterLegal />
 */

export default function FooterLegal() {
  return (
    <div className="cd-footer-legal">
      <p className="legal-highlight">
        ⚠️ 면책 조항 (Disclaimer)
      </p>
      <p>
        Code Destiny의 모든 사주·타로·운세·자미두수·베다 점성술·풍수 콘텐츠는
        <strong> 오락 및 자기 성찰 목적</strong>으로만 제공됩니다.
        제공되는 정보는 확정된 미래 예언이 아니며, 결과의 정확성을 보장하지 않습니다.
      </p>
      <p>
        의료·법률·투자·정신건강 등 중요한 사항에 대한 결정은
        반드시 해당 분야의 전문가와 상담하시기 바랍니다.
        본 서비스의 콘텐츠를 근거로 내린 결정에 대한 책임은
        이용자 본인에게 있습니다.
      </p>
      <p>
        © 2026 Code Destiny. All rights reserved. <a href="/admin/login" style={{ cursor: 'pointer', marginLeft: '6px', textDecoration: 'none' }}>🌸</a> &nbsp;·&nbsp;
        <a href="/privacy-policy">개인정보처리방침</a>
        &nbsp;·&nbsp;
        <a href="/terms">이용약관</a>
        &nbsp;·&nbsp;
        <a href="/contact-us">문의하기</a>
      </p>
    </div>
  );
}
