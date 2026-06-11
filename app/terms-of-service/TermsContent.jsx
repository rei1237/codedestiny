/**
 * 이용약관 콘텐츠 전용 컴포넌트
 * — iframe 없이 회원가입 페이지에서 인라인으로 임베드하기 위한 컴포넌트
 * — 독립 페이지(/terms-of-service)에서도 재사용 가능
 */
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../lib/site-policy-config";

export default function TermsContent() {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">시행일: 2026-04-11 / Effective Date: 2026-04-11</p>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">1. 약관의 목적 / Purpose</h3>
        <p>
          본 약관은 Code Destiny가 제공하는 온라인 서비스의 이용 조건과 절차, 당사자 간 권리·의무 및 책임사항을 규정합니다. These terms govern access to and use of Code Destiny services, including rights, obligations, and liabilities.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">2. 적용 대상 및 동의 / Scope and Acceptance</h3>
        <p>
          이용자가 서비스에 접속하거나 이용을 계속하는 경우 본 약관 및 관련 정책(개인정보처리방침 포함)에 동의한 것으로 봅니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">3. 서비스 내용 / Service Description</h3>
        <p>
          Code Destiny는 사주/타로/운세 기반의 해석 콘텐츠를 제공하며, 서비스 품질 향상을 위해 기능이 추가/변경/중단될 수 있습니다.
        </p>
        <p>서비스 주소: https://code-destiny.com / 운영자: {OPERATOR_NAME}</p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">4. 쿠키 및 제3자 광고 / Cookies and Third-Party Ads</h3>
        <p>
          서비스는 기능 제공, 이용 통계, 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense를 포함한 제3자 광고 네트워크는 사용자 관심사 기반 광고를 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정에서 이를 관리할 수 있습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">5. 이용자 자격 및 책임 / Eligibility and User Responsibility</h3>
        <p>
          이용자는 정확한 정보 입력 및 계정/기기 보안 관리 책임을 부담하며, 법령 위반, 권리 침해, 자동화된 비정상 접근, 서비스 방해 행위를 해서는 안 됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">6. 금지행위 / Prohibited Conduct</h3>
        <p>
          (1) 서비스 역설계, 크롤링, 무단 자동화 접근 (2) 악성코드 유포 및 보안 취약점 악용 (3) 타인의 개인정보 무단 수집/도용 (4) 불법 콘텐츠 게시 (5) 운영을 방해하는 일체의 행위는 금지됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">7. 지식재산권 / Intellectual Property</h3>
        <p>
          서비스와 관련된 텍스트, 디자인, 코드, 데이터 구성요소 등 일체의 권리는 Code Destiny 또는 정당한 권리자에게 귀속됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">8. 서비스 성격 및 한계 / Nature and Limitations</h3>
        <p>
          운세/타로 결과는 오락 및 참고 목적의 정보이며, 법률/의료/투자/세무 등 전문 자문을 대체하지 않습니다. Fortune interpretations are informational entertainment content and do not guarantee outcomes.
          특히 의료적 진단/치료 결과, 법률 분쟁 또는 형사 사건의 결과, 투자 수익 또는 손실 회피를 보장하지 않습니다. In particular, we do not guarantee medical outcomes, legal dispute or criminal case results, or investment returns.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">9. 면책 / Disclaimer</h3>
        <p>
          회사는 천재지변, 통신장애, 플랫폼/브라우저 문제, 제3자 서비스 중단 등 불가항력 사유로 인한 손해에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">10. 책임 제한 / Limitation of Liability</h3>
        <p>
          관련 법령이 허용하는 최대 범위 내에서 회사의 책임은 제한되며, 간접손해/특별손해/결과적 손해에 대한 책임은 배제될 수 있습니다.
        </p>
      </section>

      <section id="refund-policy" className="policy-embed-section" style={{ scrollMarginTop: "116px" }}>
        <h3 className="policy-embed-h3">11. 30일 이용권 환불 및 청약철회 안내</h3>
        <p>
          Code Destiny의 30일 이용권은 결제 완료 즉시 계정에 활성화되는 디지털 이용권이며, 서버 결제 검증 성공 시각부터 30일 동안 유지됩니다.
        </p>
        <p>
          이 30일 이용권은 자동결제 상품이 아닙니다. 만료 후 사용자가 직접 다시 구매해야 합니다.
        </p>
        <p>
          이용권 결제 후 아직 유료 기능을 이용하지 않은 경우 결제일로부터 7일 이내 고객센터를 통해 환불을 요청할 수 있습니다.
        </p>
        <p>
          이용권으로 유료 기능을 1회 이상 이용한 경우 디지털 콘텐츠 또는 유료 기능 이용이 시작된 것으로 보아 환불이 제한될 수 있습니다.
        </p>
        <p>
          서비스 장애로 이용권 혜택을 정상적으로 제공받지 못한 경우 장애 내역 확인 후 이용 기간 연장, 코인/Moonlight Stone 보상, 부분 환불 또는 전액 환불 중 적절한 방식으로 처리합니다.
        </p>
        <p>
          중복 결제 또는 결제 오류가 확인된 경우 확인 후 중복 결제분은 환불 처리합니다.
        </p>
        <p>
          환불 요청은 결제자 본인 확인 후 처리하며, 처리 기간은 결제수단과 결제대행사 정책에 따라 통상 영업일 3~10일이 소요될 수 있습니다. 환불 문의: {SUPPORT_EMAIL}
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">12. 무료 체험 및 이용권 이용 / Free Trial and Paid Pass Use</h3>
        <p>
          무료 체험 기간 중이라도 유료 기능 또는 이용권 혜택 사용이 시작된 경우, 동일 콘텐츠 또는 이용권에 대한 단순 변심 환불은 제한될 수 있습니다.
        </p>
        <p>
          이용권 종류, 30일 이용 기간, 결제 금액, 만료일, 자동결제 여부와 환불 조건은 결제 완료 전 화면에 표시됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">13. 약관 변경 / Changes to Terms</h3>
        <p>
          약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">14. 준거법 및 관할 / Governing Law</h3>
        <p>
          본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">15. 문의 / Contact</h3>
        <p>
          서비스명: Code Destiny<br />
          사이트: https://code-destiny.com<br />
          운영자: {OPERATOR_NAME}<br />
          약관 문의: {SUPPORT_EMAIL}
        </p>
      </section>
    </div>
  );
}
