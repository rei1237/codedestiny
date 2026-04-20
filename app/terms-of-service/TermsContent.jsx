/**
 * 이용약관 콘텐츠 전용 컴포넌트
 * — iframe 없이 회원가입 페이지에서 인라인으로 임베드하기 위한 컴포넌트
 * — 독립 페이지(/terms-of-service)에서도 재사용 가능
 */
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
        <p>서비스 주소: https://code-destiny.com / 운영자: 박병하</p>
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
        <h3 className="policy-embed-h3">11. 교환/환불(청약철회) 및 구독형 디지털 콘텐츠 환불 제한</h3>
        <p>
          구독 서비스 가입 후 멤버십 전용 콘텐츠를 1회라도 열람하면 디지털 콘텐츠 서비스 개시로 간주됩니다. 따라서 구독 후 7일 이내라 하더라도 해당 이용 기록이 확인되면 단순 변심에 의한 전액 환불은 제한되며, 합리적 공제 기준을 반영한 잔여분만 환불됩니다.
        </p>
        <p>
          미사용 유상 포인트는 전자상거래 관련 법령에 따라 <strong>&#39;7일이내청약철회 가능&#39;</strong> 기준으로 환불 접수할 수 있습니다.
        </p>
        <p>
          멤버십 전용 콘텐츠 진입 시 표시되는 안내 팝업에서 확인 버튼을 누르는 행위는 서비스 이용 개시 및 환불 제한 조건에 대한 전자적 동의로 간주됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">12. 무료 체험 및 자동 결제 전환 / Free Trial and Auto-Renewal</h3>
        <p>
          무료 체험 기간 중이라도 멤버십 전용 콘텐츠를 열람하여 서비스 이용이 개시된 경우, 이후 유료 전환 직후에는 단순 변심에 의한 즉시 환불이 제한될 수 있습니다.
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
          운영자: 박병하<br />
          약관 문의: seongbae555@gmail.com
        </p>
      </section>
    </div>
  );
}
