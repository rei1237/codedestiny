/**
 * 개인정보처리방침 콘텐츠 전용 컴포넌트
 * — iframe 없이 회원가입 페이지에서 인라인으로 임베드하기 위한 컴포넌트
 * — 독립 페이지(/privacy-policy)에서도 재사용 가능
 */
import { SUPPORT_EMAIL } from "../../lib/site-policy-config";

export default function PrivacyPolicyContent() {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">시행일: 2026-03-16 / Effective Date: 2026-03-16</p>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">1. 총칙 / General Notice</h3>
        <p>
          Code Destiny(https://code-destiny.com, 이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 중요하게 생각하며 관련 법령(예: 대한민국 개인정보 보호법, 정보통신망법 등)을 준수하기 위해 노력합니다. This Privacy Policy explains what data we process, why we process it, how long we keep it, and how you can exercise your rights.
        </p>
        <p>운영자(개인정보처리자): Code Destiny / Operator / Data Controller: Code Destiny</p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">2. 처리 목적 및 법적 근거 / Purpose and Legal Basis</h3>
        <p>
          서비스는 운세/타로 결과 제공, 개인화된 화면 제공, 서비스 개선, 보안 및 부정 이용 방지, 고객 문의 대응, 법적 의무 이행 목적에서 개인정보를 처리합니다. We process personal data based on your consent, contract-like necessity for service delivery, legitimate interests (security/analytics), and legal obligations where applicable.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">3. 수집하는 정보 항목 / Categories of Data We Process</h3>
        <p>
          <strong>운세 서비스 제공을 위한 필수 정보:</strong> 생년월일, 출생시간, 성별. 이 정보는 사주·자미두수·타로·주역 등 개인 맞춤형 운세 결과 산정 목적에만 사용되며, 서버에 안전하게 저장됩니다. 해당 정보는 운세 풀이 이외의 다른 목적(ex: 마케팅, 제3자 판매 등)으로 이용하지 않습니다.
        </p>
        <p>
          추가 수집 항목: 접속기기 정보(IP, 브라우저/OS, 언어, 접속시간), 로그 정보, 쿠키/로컬스토리지 식별자, 문의 시 제공되는 이메일 및 메시지 내용이 포함될 수 있습니다. We do not intentionally collect sensitive personal data beyond what is required for the fortune analysis experience.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">4. 쿠키, 분석 및 광고 / Cookies, Analytics and Ads</h3>
        <p>
          서비스는 원활한 기능 제공과 이용 패턴 분석을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense 등 제3자 파트너가 광고 제공과 측정을 위해 쿠키, 웹 비콘, IP 주소, 광고 식별자 또는 유사 식별자를 사용할 수 있으며, 이용자는 브라우저 설정 및 Google 광고 설정 페이지를 통해 맞춤 광고를 관리할 수 있습니다.
        </p>
        <p>
          Google을 포함한 제3자 광고 사업자는 이용자의 이전 방문 기록에 기반한 맞춤 광고를 제공할 수 있습니다.
        </p>
        <p>
          Google 파트너 사이트 및 앱에서 데이터가 사용되는 방식은{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            Google 파트너 사이트 데이터 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">5. 개인정보의 제3자 제공 및 처리위탁 / Third-Party Sharing</h3>
        <p>
          원칙적으로 이용자 동의 없이 개인정보를 제3자에게 판매하지 않습니다. 광고, 호스팅, 분석, 이메일 처리 등 서비스 운영을 위해 신뢰 가능한 수탁사에 처리 위탁이 이루어질 수 있습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">6. 국외 이전 가능성 / International Data Transfers</h3>
        <p>
          클라우드 인프라 또는 분석/광고 도구의 특성상 데이터가 해외 서버에서 처리될 수 있습니다. We take reasonable measures to protect transferred data through standard contractual and technical safeguards where available.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">7. 보유기간 및 파기 / Retention and Deletion</h3>
        <p>
          운세 서비스 제공을 위해 수집한 생년월일·출생시간·성별 정보는 회원 탈퇴 또는 이용자의 개인정보 삭제 요청 시 지체 없이 삭제됩니다. 해당 정보는 운세 풀이 목적 이외에는 사용되지 않습니다.
        </p>
        <p>
          그 외 개인정보는 수집 목적 달성 시 지체 없이 삭제하며, 관련 법령이 보관을 요구하는 경우 해당 기간 동안 안전하게 보관 후 파기합니다. 예시: 소비자 불만/분쟁 처리 기록(최대 3년), 접속 로그(최대 3개월).
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">8. 이용자 권리와 행사 방법 / Your Rights</h3>
        <p>
          이용자는 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다. Requests are handled without undue delay after reasonable identity verification.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">9. 아동의 개인정보 / Children&apos;s Privacy</h3>
        <p>
          서비스는 원칙적으로 만 13세 미만 아동을 대상으로 하지 않으며, 관련 정보가 수집된 사실을 인지한 경우 지체 없이 삭제 조치합니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">10. 안전성 확보 조치 / Security Measures</h3>
        <p>
          접근권한 최소화, 접근통제, 로그 모니터링, 전송 구간 보호 등 합리적인 기술적/관리적 보호조치를 운영합니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">11. 정책 변경 / Changes to this Policy</h3>
        <p>
          본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 중요한 변경 사항은 서비스 내 공지 또는 링크된 페이지를 통해 안내합니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">12. 개인정보 문의처 / Privacy Contact</h3>
        <p>
          서비스명: Code Destiny<br />
          사이트: https://code-destiny.com<br />
          개인정보 보호 문의: {SUPPORT_EMAIL}
        </p>
      </section>
    </div>
  );
}
